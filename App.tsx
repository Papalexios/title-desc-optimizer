
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { SeoDataTable } from './components/SeoDataTable';
import { RewriteModal } from './components/RewriteModal';
import { SeoAnalysis, AppState, RewriteSuggestion, AiConfig, WordPressCreds, GradeFilter } from './types';
import { crawlSite } from './services/crawlerService';
import { analyzeSeo, generateSeoSuggestions, validateApiKey } from './services/aiService';
// FIX: Removed `AnalysisResult` from this import as it's not exported from `aiLoadBalancer` and is not explicitly used in this file.
import { AILoadBalancer } from './services/aiLoadBalancer';
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
    const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
    const [crawlProgress, setCrawlProgress] = useState<{ crawled: number, total: number } | null>(null);
    const [crawlStatus, setCrawlStatus] = useState<string | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<{ analyzed: number, total: number, message: string } | null>(null);
    const [targetLocation, setTargetLocation] = useState<string | undefined>(undefined);
    const [wpCreds, setWpCreds] = useState<WordPressCreds | null>(null);
    const [wpUpdateError, setWpUpdateError] = useState<string | null>(null);
    const [rewriteQueue, setRewriteQueue] = useState<string[]>([]);
    const [rewriteQueueTotal, setRewriteQueueTotal] = useState(0);
    const [syncedUrls, setSyncedUrls] = useState<Set<string>>(new Set());
    const [analyzedUrls, setAnalyzedUrls] = useState<Set<string>>(new Set());
    const [nextConfigIndex, setNextConfigIndex] = useState(0);

    const [filterGrade, setFilterGrade] = useState<GradeFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    const hasValidApiConfig = useMemo(() => aiConfigs.some(c => c.isValid), [aiConfigs]);

    const handleAddConfig = (newConfig: AiConfig) => {
        setAiConfigs(prev => [...prev, newConfig]);
    };

    const handleRemoveConfig = (id: string) => {
        setAiConfigs(prev => prev.filter(c => c.id !== id));
    };

    const handleUpdateConfigValidation = (id: string, isValid: boolean) => {
        setAiConfigs(prev => prev.map(c => c.id === id ? { ...c, isValid } : c));
    };

    const handleCrawl = useCallback(async (url: string, sitemapUrl?: string, location?: string) => {
        if (!hasValidApiConfig) {
            setError("Please add and validate at least one AI provider API key first.");
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
        setCrawlStatus(null);
        setAnalysisProgress(null);
        setTargetLocation(location);
        
        try {
            const onCrawlProgress = (crawled: number, total: number) => setCrawlProgress({ crawled, total });
            const onStatusUpdate = (message: string) => setCrawlStatus(message);
            const pages = await crawlSite(url, sitemapUrl, onCrawlProgress, onStatusUpdate);
            
            setSeoData(pages);
            setCrawlProgress(null);
            setCrawlStatus(null);
            setAppState(AppState.Crawled);

        } catch (e) {
            console.error(e);
            setError(`Failed to crawl the website. ${(e as Error).message}`);
            setAppState(AppState.Error);
        }
    }, [hasValidApiConfig]);

    const handleAnalyzeSelected = useCallback(async () => {
        const validConfigs = aiConfigs.filter(c => c.isValid);
        if (validConfigs.length === 0) return;
        
        const urlsToAnalyze = Array.from(selectedUrls).filter(url => !analyzedUrls.has(url));
        if (urlsToAnalyze.length === 0) return;
    
        setAppState(AppState.Analyzing);
        const totalToAnalyze = urlsToAnalyze.length;
        setAnalysisProgress({ analyzed: 0, total: totalToAnalyze, message: "Initializing AI workers..." });

        const dataToAnalyze = urlsToAnalyze.map(url => seoData.find(d => d.url === url)!).filter(Boolean);
        
        const balancer = new AILoadBalancer(validConfigs);

        balancer.onProgress((progress) => {
             setAnalysisProgress({ 
                analyzed: progress.completed, 
                total: progress.total, 
                message: `Analyzing... ${progress.completed}/${progress.total}. ${progress.activeWorkers} AI workers active.`
            });
        });
        
        balancer.onResult((result) => {
             setSeoData(prevData => {
                const newData = [...prevData];
                const index = newData.findIndex(d => d.url === result.url);
                if (index !== -1) {
                    newData[index] = { ...newData[index], ...result.analysis };
                }
                return newData;
            });
            setAnalyzedUrls(prev => new Set([...prev, result.url]));
        });
        
        balancer.onError((url, error) => {
            console.error(`Failed to analyze ${url}:`, error);
            // Optionally update the UI to show an error for this specific row
        });

        await balancer.processQueue(dataToAnalyze);

        setAppState(AppState.Crawled); // Return to the main data view
        setAnalysisProgress(null);
    }, [aiConfigs, selectedUrls, analyzedUrls, seoData]);


    const handleSelectionChange = useCallback((url: string, isSelected: boolean) => {
        setSelectedUrls(prev => {
            const newSelection = new Set(prev);
            if (isSelected) newSelection.add(url);
            else newSelection.delete(url);
            return newSelection;
        });
    }, []);
    
    const getNextValidConfig = useCallback(() => {
        const validConfigs = aiConfigs.filter(c => c.isValid);
        if (validConfigs.length === 0) return null;

        const config = validConfigs[nextConfigIndex % validConfigs.length];
        setNextConfigIndex(prev => prev + 1);
        return config;
    }, [aiConfigs, nextConfigIndex]);

    const processNextInQueue = useCallback(async () => {
        if (rewriteQueue.length === 0) {
            if (rewriteQueue.length === 0) {
                setAppState(AppState.Crawled);
                setRewriteQueueTotal(0);
            }
            return;
        }

        const config = getNextValidConfig();
        if (!config) {
             setError("No valid AI configuration available for rewriting.");
             setRewriteQueue([]);
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
                dataToRewrite.topic, config, targetLocation
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
    }, [rewriteQueue, seoData, targetLocation, getNextValidConfig]);

    useEffect(() => {
        if (rewriteQueue.length > 0 && !modalData) {
            processNextInQueue();
        }
    }, [rewriteQueue, modalData, processNextInQueue]);
    
    const handleRewriteSingle = (url: string) => {
        if (!hasValidApiConfig || syncedUrls.has(url) || !analyzedUrls.has(url)) return;
        setRewriteQueue([url]);
        setRewriteQueueTotal(1);
    };

    const handleRewriteSelected = async () => {
        if (!hasValidApiConfig || selectedUrls.size === 0) return;
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
            <Header isValidApi={hasValidApiConfig} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <div className="max-w-7xl mx-auto">
                    <ApiConfig 
                        configs={aiConfigs}
                        onAddConfig={handleAddConfig}
                        onRemoveConfig={handleRemoveConfig}
                        onUpdateValidation={handleUpdateConfigValidation}
                        isDisabled={isProcessing} 
                    />
                    <UrlInput onAnalyze={handleCrawl} isLoading={appState === AppState.Crawling} isApiConfigured={hasValidApiConfig} />

                    {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">{error}</div>}

                    {isProcessing && (
                        <div className="mt-8 text-center space-y-4">
                            <p className="text-xl text-indigo-300 animate-pulse">
                                {appState === AppState.Crawling ? 'Crawling sitemap and fetching page data...' : 'AI is performing deep SEO analysis...'}
                            </p>
                            {crawlStatus && <p className="text-md text-slate-400 mt-2">{crawlStatus}</p>}
                           {appState === AppState.Crawling && crawlProgress && (
                               <ProgressBar 
                                   progress={(crawlProgress.crawled / crawlProgress.total) * 100}
                                   label={`Crawled ${crawlProgress.crawled} of ${crawlProgress.total} pages...`}
                               />
                           )}
                           {appState === AppState.Analyzing && analysisProgress && (
                                <ProgressBar 
                                   progress={(analysisProgress.analyzed / analysisProgress.total) * 100}
                                   label={analysisProgress.message}
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
