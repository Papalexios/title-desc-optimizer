import React, { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { SeoDataTable } from './components/SeoDataTable';
import { RewriteModal } from './components/RewriteModal';
import { SeoAnalysis, AiConfig, WordPressCreds, GradeFilter } from './types';
import { crawlSite, processAndScanUrls } from './services/crawlerService';
import { parseFileForUrls } from './services/fileParserService';
import { AILoadBalancer } from './services/aiLoadBalancer';
import { updateSeoOnWordPress } from './services/wordpressService';
import { ApiConfig } from './components/ApiConfig';
import { WordPressCredsModal } from './components/WordPressCredsModal';
import { Dashboard } from './components/Dashboard';
import { SeoDataTableControls } from './components/SeoDataTableControls';
import { ProgressBar } from './components/common/ProgressBar';
import Footer from './components/Footer';

const App: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUpdatingWp, setIsUpdatingWp] = useState(false);
    const [isAwaitingWpCreds, setIsAwaitingWpCreds] = useState(false);

    const [seoData, setSeoData] = useState<SeoAnalysis[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [modalData, setModalData] = useState<SeoAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
    const [processProgress, setProcessProgress] = useState<{ processed: number, total: number } | null>(null);
    const [processStatus, setProcessStatus] = useState<string | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<{ analyzed: number, total: number, message: string } | null>(null);
    const [targetLocation, setTargetLocation] = useState<string | undefined>(undefined);
    const [wpCreds, setWpCreds] = useState<WordPressCreds | null>(null);
    const [wpUpdateError, setWpUpdateError] = useState<string | null>(null);
    
    const [filterGrade, setFilterGrade] = useState<GradeFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    const hasValidApiConfig = useMemo(() => aiConfigs.some(c => c.isValid), [aiConfigs]);

    const handleAddConfig = (newConfig: AiConfig) => setAiConfigs(prev => [...prev, newConfig]);
    const handleRemoveConfig = (id: string) => setAiConfigs(prev => prev.filter(c => c.id !== id));
    const handleUpdateConfigValidation = (id: string, isValid: boolean) => {
        setAiConfigs(prev => prev.map(c => c.id === id ? { ...c, isValid } : c));
    };

    const resetStateForNewJob = () => {
        setIsProcessing(true);
        setError(null);
        setSelectedUrls(new Set());
        setSeoData([]);
        setProcessProgress(null);
        setProcessStatus("Initializing...");
        setAnalysisProgress(null);
    };

    const handleCrawl = useCallback(async (url: string, sitemapUrl?: string, location?: string) => {
        if (!hasValidApiConfig) {
            setError("Please add and validate at least one AI provider API key first.");
            return;
        }
        resetStateForNewJob();
        setTargetLocation(location);
        
        try {
            const pages = await crawlSite(
                url, sitemapUrl, 
                (p, t) => setProcessProgress({ processed: p, total: t }),
                (msg) => setProcessStatus(msg)
            );
            setSeoData(pages);
        } catch (e) {
            console.error(e);
            setError(`Failed to crawl the website. ${(e as Error).message}`);
        } finally {
            setIsProcessing(false);
            setProcessProgress(null);
            setProcessStatus(null);
        }
    }, [hasValidApiConfig]);

    const handleProcessFile = useCallback(async (file: File, location?: string) => {
        if (!hasValidApiConfig) {
            setError("Please add and validate at least one AI provider API key first.");
            return;
        }
        resetStateForNewJob();
        setTargetLocation(location);

        try {
            setProcessStatus(`Parsing ${file.name}...`);
            const urls = await parseFileForUrls(file);
            
            setProcessStatus(`Found ${urls.length} URLs. Processing pages...`);
            const pages = await processAndScanUrls(
                urls,
                (p, t) => setProcessProgress({ processed: p, total: t }),
                (msg) => setProcessStatus(msg)
            );
            setSeoData(pages);
        } catch (e) {
            console.error(e);
            setError(`Failed to process file. ${(e as Error).message}`);
        } finally {
            setIsProcessing(false);
            setProcessProgress(null);
            setProcessStatus(null);
        }
    }, [hasValidApiConfig]);


    const handleAnalyzeAndSuggestSelected = useCallback(async () => {
        const validConfigs = aiConfigs.filter(c => c.isValid);
        if (validConfigs.length === 0) return;
        
        const urlsToProcess: string[] = [];
        const cachedDataToUpdate: SeoAnalysis[] = [];

        Array.from(selectedUrls).forEach(url => {
            const data = seoData.find(d => d.url === url);
            if (data && (data.status === 'scanned' || data.status === 'error')) {
                const cachedResult = sessionStorage.getItem(`analysis_${url}`);
                if (cachedResult) {
                    console.log(`Using cached result for ${url}`);
                    const parsedResult = JSON.parse(cachedResult);
                    const combinedGrade = Math.round((parsedResult.analysis.titleGrade + parsedResult.analysis.descriptionGrade) / 2);
                    const updatedItem: SeoAnalysis = {
                        ...data,
                        ...parsedResult.analysis,
                        grade: combinedGrade,
                        suggestions: parsedResult.suggestions,
                        status: 'analyzed',
                    };
                    cachedDataToUpdate.push(updatedItem);
                } else {
                    urlsToProcess.push(url);
                }
            }
        });

        if (cachedDataToUpdate.length > 0) {
            setSeoData(prev => prev.map(d => cachedDataToUpdate.find(c => c.url === d.url) || d));
        }

        if (urlsToProcess.length === 0) return;
    
        setIsAnalyzing(true);
        setAnalysisProgress({ analyzed: 0, total: urlsToProcess.length, message: "Initializing AI workers..." });
        
        setSeoData(prev => prev.map(d => urlsToProcess.includes(d.url) ? { ...d, status: 'analyzing', analysisError: undefined } : d));

        const dataToProcess = urlsToProcess.map(url => seoData.find(d => d.url === url)!).filter(Boolean);
        const balancer = new AILoadBalancer(validConfigs);

        balancer.onProgress((progress) => {
             setAnalysisProgress({ 
                analyzed: progress.completed, 
                total: progress.total, 
                message: `Processing... ${progress.completed}/${progress.total}. ${progress.activeWorkers} AI workers active.`
            });
        });
        
        balancer.onResult((result) => {
             sessionStorage.setItem(`analysis_${result.url}`, JSON.stringify(result.data));

             setSeoData(prevData => prevData.map(d => {
                if (d.url === result.url) {
                    const combinedGrade = Math.round((result.data.analysis.titleGrade + result.data.analysis.descriptionGrade) / 2);
                    return {
                        ...d,
                        ...result.data.analysis,
                        grade: combinedGrade,
                        suggestions: result.data.suggestions,
                        status: 'analyzed',
                    };
                }
                return d;
            }));
        });
        
        balancer.onError((url, error) => {
            console.error(`Failed to analyze ${url}:`, error);
            setSeoData(prevData => prevData.map(d => d.url === url ? { ...d, status: 'error', analysisError: error.message } : d));
        });

        await balancer.processQueue(dataToProcess, { allPages: seoData, targetLocation });

        setIsAnalyzing(false);
        setAnalysisProgress(null);
    }, [aiConfigs, selectedUrls, seoData, targetLocation]);

    const handleSelectionChange = useCallback((url: string, isSelected: boolean) => {
        setSelectedUrls(prev => {
            const newSelection = new Set(prev);
            if (isSelected) newSelection.add(url);
            else newSelection.delete(url);
            return newSelection;
        });
    }, []);

    const handleOpenRewriteModal = (url: string) => {
        const data = seoData.find(d => d.url === url);
        if (data && data.status === 'analyzed') {
            setModalData(data);
        }
    };

    const handleUpdateSeo = async (url: string, newTitle: string, newDescription: string): Promise<void> => {
        if (!wpCreds) {
            setIsAwaitingWpCreds(true);
            throw new Error("WordPress credentials are not configured.");
        }
        setIsUpdatingWp(true);
        setWpUpdateError(null);
        
        setSeoData(prevData => prevData.map(item => item.url === url ? { ...item, status: 'updating' } : item));

        try {
            await updateSeoOnWordPress(wpCreds, url, newTitle, newDescription);
            setSeoData(prevData => prevData.map(item => item.url === url ? { 
                ...item, 
                title: newTitle, 
                description: newDescription,
                status: 'synced',
            } : item));
            
            setSelectedUrls(prev => {
                const newSelection = new Set(prev);
                newSelection.delete(url);
                return newSelection;
            });
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error("WordPress Update Failed:", errorMessage);
            setWpUpdateError(errorMessage);
            setSeoData(prevData => prevData.map(item => item.url === url ? { ...item, status: 'analyzed' } : item)); // Revert status
            throw error;
        } finally {
            setIsUpdatingWp(false);
        }
    };

    const handleSaveWpCreds = (creds: WordPressCreds) => {
        setWpCreds(creds);
        setIsAwaitingWpCreds(false);
        const updateButton = document.querySelector('#wp-update-button') as HTMLButtonElement;
        if (updateButton) setTimeout(() => updateButton.click(), 100);
    };

    const handleCloseModal = () => {
        setModalData(null);
        setWpUpdateError(null);
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
        return Array.from(selectedUrls).filter(url => {
            const item = seoData.find(d => d.url === url);
            return item && (item.status === 'scanned' || item.status === 'error');
        }).length;
    }, [selectedUrls, seoData]);
    
    const isBusy = isProcessing || isAnalyzing;

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
                        isDisabled={isBusy} 
                    />
                    <UrlInput 
                        onCrawl={handleCrawl} 
                        onProcessFile={handleProcessFile}
                        isLoading={isProcessing} 
                        isApiConfigured={hasValidApiConfig} 
                    />

                    {error && <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">{error}</div>}

                    {isBusy && (
                        <div className="mt-8 text-center space-y-4">
                            <p className="text-xl text-indigo-300 animate-pulse">
                                {isProcessing ? 'Processing pages...' : 'AI is performing deep SEO analysis...'}
                            </p>
                            {processStatus && <p className="text-md text-slate-400 mt-2">{processStatus}</p>}
                           {isProcessing && processProgress && (
                               <ProgressBar 
                                   progress={(processProgress.processed / processProgress.total) * 100}
                                   label={`Processed ${processProgress.processed} of ${processProgress.total} pages...`}
                               />
                           )}
                           {isAnalyzing && analysisProgress && (
                                <ProgressBar 
                                   progress={(analysisProgress.analyzed / analysisProgress.total) * 100}
                                   label={analysisProgress.message}
                               />
                            )}
                        </div>
                    )}

                    {seoData.length > 0 && !isProcessing && (
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
                                onSelectionChange={handleSelectionChange}
                                onOpenRewriteModal={handleOpenRewriteModal}
                            />
                            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-4">
                                <button
                                    onClick={handleAnalyzeAndSuggestSelected}
                                    disabled={selectableForAnalysisCount === 0 || isBusy}
                                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    Analyze & Generate Suggestions ({selectableForAnalysisCount})
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
            
            {isAwaitingWpCreds && (
                <WordPressCredsModal 
                    onSave={handleSaveWpCreds} 
                    onClose={() => setIsAwaitingWpCreds(false)} 
                    initialUrl={modalData?.url}
                />
            )}

            {modalData && (
                <RewriteModal
                    data={modalData}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateSeo}
                    isUpdating={isUpdatingWp}
                    updateError={wpUpdateError}
                />
            )}
            
            <Footer />
        </div>
    );
};

export default App;