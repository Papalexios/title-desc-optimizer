import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { SeoDataTable } from './components/SeoDataTable';
import { RewriteModal } from './components/RewriteModal';
import { SeoAnalysis, AppState, RewriteSuggestion, AiConfig, WordPressCreds, GradeFilter } from './types';
import { crawlSite } from './services/crawlerService';
import { analyzeSeo, generateSeoSuggestions, validateApiKey } from './services/aiService';
import { updateSeoOnWordPress } from './services/wordpressService';
import { ApiConfig } from './components/ApiConfig';
import { WordPressCredsModal } from './components/WordPressCredsModal';
import { Dashboard } from './components/Dashboard';
import { SeoDataTableControls } from './components/SeoDataTableControls';
import { BatchProgressBar } from './components/common/BatchProgressBar';
import { ProgressBar } from './components/common/ProgressBar';
import Footer from './components/Footer';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.Initial);
    const [seoData, setSeoData] = useState<SeoAnalysis[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [modalData, setModalData] = useState<{ url: string, suggestions: RewriteSuggestion[], generationError?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
    const [isApiConfigValid, setIsApiConfigValid] = useState<boolean>(false);
    const [crawlProgress, setCrawlProgress] = useState<{ crawled: number, total: number } | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<{ analyzed: number, total: number } | null>(null);
    const [targetLocation, setTargetLocation] = useState<string | undefined>(undefined);
    const [wpCreds, setWpCreds] = useState<WordPressCreds | null>(null);
    const [wpUpdateError, setWpUpdateError] = useState<string | null>(null);
    const [rewriteQueue, setRewriteQueue] = useState<string[]>([]);
    const [rewriteQueueTotal, setRewriteQueueTotal] = useState(0);
    const [syncedUrls, setSyncedUrls] = useState<Set<string>>(new Set());
    const [analyzedUrls, setAnalyzedUrls] = useState<Set<string>>(new Set());

    const [filterGrade, setFilterGrade] = useState<GradeFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const handleConfigSave = useCallback(async (config: AiConfig): Promise<boolean> => {
        const isValid = await validateApiKey(config);
        if (isValid) {
            setAiConfig(config);
            setIsApiConfigValid(true);
        } else {
            setAiConfig(null);
            setIsApiConfigValid(false);
        }
        return isValid;
    }, []);

    const handleCrawl = useCallback(async (url: string, sitemapUrl?: string, location?: string) => {
        if (!isApiConfigValid || !aiConfig) {
            setError("Please configure and validate your AI provider API key first.");
            return;
        }
        setAppState(AppState.Crawling);
        setError(null);
        setSelectedUrls(new Set());
        setSyncedUrls(new Set());
        setAnalyzedUrls(new Set());
        setSeoData([]);
        setFilterGrade('all');
        setSearchTerm('');
        setCrawlProgress(null);
        setAnalysisProgress(null);
        setTargetLocation(location);
        
        try {
            const onCrawlProgress = (crawled: number, total: number) => setCrawlProgress({ crawled, total });
            const pages = await crawlSite(url, sitemapUrl, onCrawlProgress);
            
            setSeoData(pages);
            setCrawlProgress(null);
            setAppState(AppState.Crawled);

        } catch (e) {
            console.error(e);
            setError(`Failed to crawl the website. ${(e as Error).message}`);
            setAppState(AppState.Error);
        }
    }, [aiConfig, isApiConfigValid]);

    const handleAnalyzeSelected = useCallback(async () => {
        if (!aiConfig) return;
        const urlsToAnalyze = Array.from(selectedUrls).filter(url => !analyzedUrls.has(url));
        if (urlsToAnalyze.length === 0) return;

        setAppState(AppState.Analyzing);
        const totalToAnalyze = urlsToAnalyze.length;
        setAnalysisProgress({ analyzed: 0, total: totalToAnalyze });

        // Quadrupled concurrency for a massive speed boost in AI analysis.
        const AI_CONCURRENCY_LIMIT = 20;

        for (let i = 0; i < urlsToAnalyze.length; i += AI_CONCURRENCY_LIMIT) {
            const chunkUrls = urlsToAnalyze.slice(i, i + AI_CONCURRENCY_LIMIT);
            const chunkData = chunkUrls.map(url => seoData.find(d => d.url === url)!).filter(Boolean);

            const analysisPromises = chunkData.map(page =>
                analyzeSeo(page.title, page.description, aiConfig).then(analysis => ({
                    url: page.url,
                    ...analysis,
                    grade: Math.round((analysis.titleGrade + analysis.descriptionGrade) / 2),
                }))
            );
            const chunkResults = await Promise.all(analysisPromises);

            setSeoData(prevData => {
                const newData = [...prevData];
                chunkResults.forEach(result => {
                    const index = newData.findIndex(d => d.url === result.url);
                    if (index !== -1) {
                        newData[index] = { ...newData[index], ...result };
                    }
                });
                return newData;
            });
            
            setAnalyzedUrls(prev => new Set([...prev, ...chunkUrls]));
            setAnalysisProgress({ analyzed: Math.min(i + AI_CONCURRENCY_LIMIT, totalToAnalyze), total: totalToAnalyze });
        }
        
        setAppState(AppState.Crawled); // Return to the main data view
        setAnalysisProgress(null);
    }, [aiConfig, selectedUrls, analyzedUrls, seoData]);

    const handleSelectionChange = useCallback((url: string, isSelected: boolean) => {
        setSelectedUrls(prev => {
            const newSelection = new Set(prev);
            if (isSelected) newSelection.add(url);
            else newSelection.delete(url);
            return newSelection;
        });
    }, []);

    const processNextInQueue = useCallback(async () => {
        if (rewriteQueue.length === 0 || !aiConfig) {
            if (rewriteQueue.length === 0) {
                setAppState(AppState.Crawled);
                setRewriteQueueTotal(0);
            }
            return;
        }

        const nextUrl = rewriteQueue[0];
        const dataToRewrite = seoData.find(d => d.url === nextUrl);

        if (!dataToRewrite || dataToRewrite.grade === undefined || dataToRewrite.topic === undefined) {
            console.warn(`Could not find data for ${nextUrl} or it's not analyzed, skipping.`);
            setRewriteQueue(prev => prev.slice(1));
            return;
        }

        setAppState(AppState.Rewriting);
        setError(null);

        try {
            const suggestions = await generateSeoSuggestions(
                dataToRewrite.title, dataToRewrite.description, dataToRewrite.url,
                dataToRewrite.topic, aiConfig, targetLocation
            );
            setModalData({ url: nextUrl, suggestions });
        } catch (e) {
            console.error(`Failed to generate suggestions for ${nextUrl}:`, e);
            setModalData({
                url: nextUrl,
                suggestions: [],
                generationError: `AI Error: ${(e as Error).message}. You can skip to the next item in the queue.`
            });
        }
    }, [rewriteQueue, aiConfig, seoData, targetLocation]);

    useEffect(() => {
        if (rewriteQueue.length > 0 && !modalData) {
            processNextInQueue();
        }
    }, [rewriteQueue, modalData, processNextInQueue]);
    
    const handleRewriteSingle = (url: string) => {
        if (!aiConfig || syncedUrls.has(url) || !analyzedUrls.has(url)) return;
        setRewriteQueue([url]);
        setRewriteQueueTotal(1);
    };

    const handleRewriteSelected = async () => {
        if (!aiConfig || selectedUrls.size === 0) return;
        const urlsToRewrite = Array.from(selectedUrls).filter(url => !syncedUrls.has(url) && analyzedUrls.has(url));
        if (urlsToRewrite.length === 0) return;
        setRewriteQueue(urlsToRewrite);
        setRewriteQueueTotal(urlsToRewrite.length);
    };
    
    const handleUpdateSeo = async (url: string, newTitle: string, newDescription: string): Promise<void> => {
        if (!wpCreds) {
            setAppState(AppState.AwaitingWpCreds);
            throw new Error("WordPress credentials are not configured.");
        }
        setAppState(AppState.UpdatingWp);
        setWpUpdateError(null);
        try {
            await updateSeoOnWordPress(wpCreds, url, newTitle, newDescription);
            setSeoData(prevData =>
                prevData.map(item => item.url === url ? { ...item, title: newTitle, description: newDescription } : item)
            );
            setSyncedUrls(prev => new Set(prev).add(url));
            setSelectedUrls(prev => {
                const newSelection = new Set(prev);
                newSelection.delete(url);
                return newSelection;
            });
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error("WordPress Update Failed:", errorMessage);
            setWpUpdateError(errorMessage);
            throw error;
        }
    };

    const handleSaveWpCreds = (creds: WordPressCreds) => {
        setWpCreds(creds);
        setAppState(AppState.Rewriting);
        const rewriteButton = document.querySelector('#rewrite-button') as HTMLButtonElement;
        if (rewriteButton) setTimeout(() => rewriteButton.click(), 100);
    };

    const handleCloseModal = () => {
        setModalData(null);
        setWpUpdateError(null);
        setRewriteQueue(prev => prev.slice(1));
    };

    const handleStopBatch = () => {
        setModalData(null);
        setRewriteQueue([]);
        setRewriteQueueTotal(0);
        setAppState(AppState.Crawled);
    };

    const filteredData = useMemo(() => {
        return seoData.filter(item => {
            const gradeMatch =
                filterGrade === 'all' ||
                (filterGrade === 'good' && item.grade !== undefined && item.grade >= 85) ||
                (filterGrade === 'average' && item.grade !== undefined && item.grade >= 60 && item.grade < 85) ||
                (filterGrade === 'poor' && item.grade !== undefined && item.grade < 60);
            const searchMatch = item.url.toLowerCase().includes(searchTerm.toLowerCase());
            return gradeMatch && searchMatch;
        });
    }, [seoData, filterGrade, searchTerm]);
    
    const selectableForAnalysisCount = useMemo(() => {
        return Array.from(selectedUrls).filter(url => !analyzedUrls.has(url)).length;
    }, [selectedUrls, analyzedUrls]);
    
    const selectableForRewriteCount = useMemo(() => {
        return Array.from(selectedUrls).filter(url => analyzedUrls.has(url) && !syncedUrls.has(url)).length;
    }, [selectedUrls, analyzedUrls, syncedUrls]);

    const isProcessing = appState === AppState.Crawling || appState === AppState.Analyzing;
    const isCrawled = seoData.length > 0;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col">
            <Header isValidApi={isApiConfigValid} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <div className="max-w-7xl mx-auto">
                    <ApiConfig onConfigSave={handleConfigSave} isDisabled={isProcessing} />
                    <UrlInput onAnalyze={handleCrawl} isLoading={appState === AppState.Crawling} isApiConfigured={isApiConfigValid} />

                    {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">{error}</div>}

                    {isProcessing && (
                        <div className="mt-8 text-center space-y-4">
                            <p className="text-xl text-indigo-300 animate-pulse">
                                {appState === AppState.Crawling ? 'Crawling sitemap and fetching page data...' : 'AI is performing deep SEO analysis...'}
                            </p>
                           {appState === AppState.Crawling && crawlProgress && (
                               <ProgressBar 
                                   progress={(crawlProgress.crawled / crawlProgress.total) * 100}
                                   label={`Crawled ${crawlProgress.crawled} of ${crawlProgress.total} pages...`}
                               />
                           )}
                           {appState === AppState.Analyzing && analysisProgress && (
                                <ProgressBar 
                                   progress={(analysisProgress.analyzed / analysisProgress.total) * 100}
                                   label={`AI analyzing page ${analysisProgress.analyzed} of ${analysisProgress.total}...`}
                               />
                            )}
                        </div>
                    )}

                    {isCrawled && appState !== AppState.Crawling && (
                        <>
                            <Dashboard data={seoData} />
                            <SeoDataTableControls
                                filter={filterGrade}
                                onFilterChange={setFilterGrade}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                            />
                            <SeoDataTable
                                data={filteredData}
                                selectedUrls={selectedUrls}
                                syncedUrls={syncedUrls}
                                analyzedUrls={analyzedUrls}
                                onSelectionChange={handleSelectionChange}
                                onRewriteSingle={handleRewriteSingle}
                            />
                            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-4">
                                <button
                                    onClick={handleAnalyzeSelected}
                                    disabled={selectableForAnalysisCount === 0 || isProcessing}
                                    className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    Analyze Selected ({selectableForAnalysisCount})
                                </button>
                                <button
                                    onClick={handleRewriteSelected}
                                    disabled={selectableForRewriteCount === 0 || isProcessing}
                                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    Rewrite Selected with AI ({selectableForRewriteCount})
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
            
            {appState === AppState.AwaitingWpCreds && (
                <WordPressCredsModal 
                    onSave={handleSaveWpCreds} 
                    onClose={() => setAppState(AppState.Rewriting)} 
                    initialUrl={modalData?.url}
                />
            )}

            {modalData && (appState === AppState.Rewriting || appState === AppState.UpdatingWp || appState === AppState.AwaitingWpCreds) && (
                <RewriteModal
                    url={modalData.url}
                    suggestions={modalData.suggestions}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateSeo}
                    originalData={seoData.find(d => d.url === modalData.url)!}
                    isUpdating={appState === AppState.UpdatingWp}
                    updateError={wpUpdateError}
                    queuePosition={rewriteQueueTotal - rewriteQueue.length + 1}
                    queueTotal={rewriteQueueTotal > 1 ? rewriteQueueTotal : undefined}
                    generationError={modalData.generationError}
                    onStopBatch={handleStopBatch}
                />
            )}
            
            {(appState === AppState.Rewriting || appState === AppState.UpdatingWp) && rewriteQueueTotal > 1 && (
                 <BatchProgressBar
                    current={rewriteQueueTotal - rewriteQueue.length}
                    total={rewriteQueueTotal}
                />
            )}
            <Footer />
        </div>
    );
};

export default App;