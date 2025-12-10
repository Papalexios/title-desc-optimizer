
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { SeoDataTable } from './components/SeoDataTable';
import { SeoAnalysis, AiConfig, WordPressCreds, RewriteSuggestion, TopicCluster } from './types';
import { crawlSite, processAndScanUrls } from './services/crawlerService';
import { parseFileForUrls } from './services/fileParserService';
import { AILoadBalancer, Job } from './services/aiLoadBalancer';
import { updateSeoOnWordPress } from './services/wordpressService';
import { ApiConfig } from './components/ApiConfig';
import { WordPressCredsModal } from './components/WordPressCredsModal';
import { Dashboard } from './components/Dashboard';
import { ProgressBar } from './components/common/ProgressBar';
import Footer from './components/Footer';
import { extractTopicsForClustering, calculatePriorityScore } from './services/aiService';
import { fetchSerpData } from './services/serpService';
import { cacheService } from './services/cacheService';
import { SiteStructurePanel } from './components/SiteStructurePanel';
import { DetailPanel } from './components/DetailPanel';
import { ReviewAndSyncPanel } from './components/ReviewAndSyncPanel';
import { BulkOperationsPanel } from './components/BulkOperationsPanel';


const App: React.FC = () => {
    type ViewMode = 'dashboard' | 'review';
    type AuditStage = 'idle' | 'crawling' | 'clustering' | 'analyzing' | 'prioritizing' | 'complete';

    // Core State
    const [seoData, setSeoData] = useState<SeoAnalysis[]>([]);
    const [topicClusters, setTopicClusters] = useState<TopicCluster[]>([]);
    const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
    const [wpCreds, setWpCreds] = useState<WordPressCreds | null>(null);

    // UI & Flow State
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [auditStage, setAuditStage] = useState<AuditStage>('idle');
    const [error, setError] = useState<string | null>(null);
    const [activeDetailUrl, setActiveDetailUrl] = useState<string | null>(null);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set<string>());
    
    // Progress & Status State
    const [progress, setProgress] = useState<{ processed: number, total: number, stage: string } | null>(null);
    const [processStatus, setProcessStatus] = useState<string | null>(null);
    const [isUpdatingWp, setIsUpdatingWp] = useState(false);
    const [isAwaitingWpCreds, setIsAwaitingWpCreds] = useState(false);
    const [wpUpdateError, setWpUpdateError] = useState<string | null>(null);
    
    // Filters & Sorting
    const [filter, setFilter] = useState<{ activeCluster: string }>({ activeCluster: 'All Pages' });
    const [targetLocation, setTargetLocation] = useState<string | undefined>(undefined);
    
    // Refs for batching
    const resultBufferRef = useRef<Map<string, Partial<SeoAnalysis>>>(new Map());
    const bufferFlushTimerRef = useRef<number | null>(null);

    const hasValidApiConfig = useMemo(() => aiConfigs.some(c => c.isValid), [aiConfigs]);
    const isBusy = useMemo(() => auditStage !== 'idle' && auditStage !== 'complete', [auditStage]);

    // Derived State
    const auditComplete = useMemo(() => seoData.some(d => d.status === 'analyzed'), [seoData]);
    const pagesForReview = useMemo(() => seoData.filter(d => d.status === 'analyzed' && d.pendingSuggestion), [seoData]);

    const filteredData = useMemo(() => {
        if (filter.activeCluster === 'All Pages') return seoData;
        return topicClusters.find(c => c.topic === filter.activeCluster)?.pages || [];
    }, [seoData, filter, topicClusters]);

    // Save/Load Configs
    useEffect(() => {
        const saved = localStorage.getItem('aiConfigs');
        if (saved) setAiConfigs(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('aiConfigs', JSON.stringify(aiConfigs));
    }, [aiConfigs]);

    const handleAddConfig = (newConfig: AiConfig) => setAiConfigs(prev => [...prev, newConfig]);
    const handleRemoveConfig = (id: string) => setAiConfigs(prev => prev.filter(c => c.id !== id));
    const handleUpdateConfigValidation = (id: string, isValid: boolean) => {
        setAiConfigs(prev => prev.map(c => c.id === id ? { ...c, isValid } : c));
    };

    const resetStateForNewJob = () => {
        setError(null);
        setSeoData([]);
        setTopicClusters([]);
        setProgress(null);
        setProcessStatus("Initializing...");
        setActiveDetailUrl(null);
        setFilter({ activeCluster: 'All Pages' });
        setViewMode('dashboard');
        setSelectedUrls(new Set<string>());
    };
    
    const startAudit = async (auditFn: () => Promise<SeoAnalysis[]>) => {
        resetStateForNewJob();
        setAuditStage('crawling');
        try {
            const initialData = await auditFn();
            setSeoData(initialData);
            setAuditStage('idle'); 
            setProcessStatus("Scan Complete. Select pages to analyze.");
            setProgress(null);
        } catch (e) {
            console.error(e);
            setError(`Failed during initial data discovery. ${(e as Error).message}`);
            setAuditStage('idle');
        }
    }

    const handleCrawl = (url: string, sitemapUrl?: string, location?: string) => {
        setTargetLocation(location);
        startAudit(() => crawlSite(
            url, sitemapUrl, 
            (p, t) => setProgress({ processed: p, total: t, stage: 'Scanning Site...' }),
            (msg) => setProcessStatus(msg)
        ));
    };

    const handleProcessFile = (file: File, location?: string) => {
        setTargetLocation(location);
        startAudit(async () => {
            setProcessStatus("Parsing file for URLs...");
            const urls = await parseFileForUrls(file);
            setProcessStatus(`Found ${urls.length} URLs. Starting processing...`);
            return processAndScanUrls(
                urls,
                (p, t) => setProgress({ processed: p, total: t, stage: 'Scanning URLs...' }),
                (msg) => setProcessStatus(msg)
            );
        });
    };
    
    const flushResultBuffer = useCallback(() => {
        if (resultBufferRef.current.size === 0) return;

        setSeoData(prevData => {
            return prevData.map(d => {
                const update = resultBufferRef.current.get(d.url);
                if (update) {
                    return { ...d, ...update };
                }
                return d;
            });
        });
        
        resultBufferRef.current.clear();
        bufferFlushTimerRef.current = null;
    }, []);

    const handleToggleSelection = useCallback((url: string) => {
        setSelectedUrls(prev => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url);
            else next.add(url);
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedUrls(prev => {
            if (prev.size === filteredData.length) return new Set<string>();
            return new Set(filteredData.map(p => p.url));
        });
    }, [filteredData]);

    const runAutomatedAnalysis = async (targetUrls: string[], operation: 'analyze' | 'regenerate') => {
        const validConfigs = aiConfigs.filter(c => c.isValid);
        if (validConfigs.length === 0) {
             setError("Please add and validate at least one AI provider API key first.");
             return;
        }

        const scopeData = seoData.filter(p => targetUrls.includes(p.url));
        if (scopeData.length === 0) return;
        
        setAuditStage('clustering');
        
        const cachedAnalysis = await cacheService.getMany(targetUrls);
        const nonCachedForCluster = scopeData.filter(p => !cachedAnalysis.has(p.url) && !p.topic);

        cachedAnalysis.forEach((data, url) => {
             if (data.topic) {
                 const index = seoData.findIndex(p => p.url === url);
                 if (index !== -1 && !seoData[index].topic) {
                     seoData[index].topic = data.topic;
                 }
             }
        });

        if (nonCachedForCluster.length > 0) {
             const topicExtractorConfig = validConfigs[0];
             const newTopics = await extractTopicsForClustering(
                nonCachedForCluster, topicExtractorConfig,
                (processed, total) => setProgress({ stage: 'AI Clustering Topics...', processed, total })
            );
            
            setSeoData(prev => prev.map(p => {
                if (newTopics.has(p.url)) {
                    return { ...p, topic: newTopics.get(p.url), primaryTopic: newTopics.get(p.url) };
                }
                return p;
            }));
        }

        const clustersMap = new Map<string, SeoAnalysis[]>();
        seoData.forEach(page => {
            const topic = page.topic || 'Uncategorized';
            if (!clustersMap.has(topic)) clustersMap.set(topic, []);
            clustersMap.get(topic)!.push(page);
        });
        const topicClusterData: TopicCluster[] = Array.from(clustersMap.entries()).map(([topic, pages]) => ({
            topic, pages, pageCount: pages.length, analyzedCount: 0
        })).sort((a,b) => b.pageCount - a.pageCount);
        setTopicClusters(topicClusterData);

        setAuditStage('analyzing');
        const balancer = new AILoadBalancer(validConfigs);
        let completedCount = 0;
        
        const pagesToAnalyze: Job[] = [];
        
        for (const page of scopeData) {
            const cached = cachedAnalysis.get(page.url);
            
            if (operation === 'analyze' && cached && cached.suggestions && cached.titleGrade) {
                resultBufferRef.current.set(page.url, { ...cached, status: 'analyzed' });
                completedCount++;
            } else {
                 const topic = page.topic || 'Uncategorized';
                 const serpData = await fetchSerpData(topic, targetLocation);
                 
                 const clusterSiblings = seoData
                    .filter(p => (p.topic === topic || p.topic === page.topic) && p.url !== page.url)
                    .map(p => ({ url: p.url, title: p.title }));

                 pagesToAnalyze.push({
                    data: page,
                    retries: 0,
                    serpData: serpData,
                    topicCluster: clusterSiblings
                });
            }
        }
        
        flushResultBuffer();

        const totalToAnalyze = pagesToAnalyze.length;

        if (totalToAnalyze > 0) {
            balancer.onProgress(progress => {
                requestAnimationFrame(() => {
                    setProgress({ stage: `AI Analyzing Selected Pages...`, processed: progress.completed + completedCount, total: scopeData.length });
                });
            });

            balancer.onResult(result => {
                const combinedGrade = Math.round((result.data.analysis.titleGrade + result.data.analysis.descriptionGrade) / 2);
                const enhancedData = { 
                    ...result.data.analysis,
                    grade: combinedGrade, 
                    suggestions: result.data.suggestions, 
                    pendingSuggestion: result.data.suggestions?.[0], 
                    status: 'analyzed' 
                } as any;
                
                cacheService.set(result.url, { ...enhancedData, url: result.url });
                resultBufferRef.current.set(result.url, enhancedData);

                if (resultBufferRef.current.size >= 3) {
                    if (bufferFlushTimerRef.current) clearTimeout(bufferFlushTimerRef.current);
                    flushResultBuffer();
                } else if (!bufferFlushTimerRef.current) {
                    bufferFlushTimerRef.current = window.setTimeout(flushResultBuffer, 500);
                }
            });

            balancer.onError((url, error) => {
                 resultBufferRef.current.set(url, { status: 'error', analysisError: error.message });
                 if (!bufferFlushTimerRef.current) bufferFlushTimerRef.current = window.setTimeout(flushResultBuffer, 1000);
            });
            
            await balancer.processQueue(pagesToAnalyze, { allPages: seoData, targetLocation });
            flushResultBuffer();
        }

        setAuditStage('prioritizing');
        await new Promise(r => setTimeout(r, 200));
        
        const pagesToScore = seoData.filter(p => targetUrls.includes(p.url) && p.status === 'analyzed' && p.priorityScore === undefined);
        
        if (pagesToScore.length > 0) {
             const scores = await calculatePriorityScore(
                pagesToScore,
                validConfigs[0],
                (processed, total) => setProgress({ stage: 'AI Calculating Priority...', processed, total })
            );
            
            setSeoData(prev => prev.map(p => {
                const score = scores.get(p.url);
                if (score !== undefined) {
                     const updated = { ...p, priorityScore: score };
                     cacheService.set(p.url, updated);
                     return updated;
                }
                return p;
            }));
        }

        setAuditStage('complete');
        setProgress(null);
        setProcessStatus(null);
    };

    const handleRowClick = useCallback((url: string) => {
        setActiveDetailUrl(url);
    }, []);

    const handleUpdateSeo = async (url: string, newTitle: string, newDescription: string): Promise<void> => {
        if (!wpCreds) {
            setIsAwaitingWpCreds(true);
            throw new Error("WordPress credentials are not configured.");
        }
        setSeoData(prevData => prevData.map(item => item.url === url ? { ...item, status: 'updating' } : item));
        try {
            await updateSeoOnWordPress(wpCreds, url, newTitle, newDescription);
            const updatedItem = { 
                ...seoData.find(i => i.url === url)!, 
                title: newTitle, 
                description: newDescription, 
                status: 'synced' as const, 
                pendingSuggestion: undefined 
            };
            
            setSeoData(prevData => prevData.map(item => item.url === url ? updatedItem : item));
            cacheService.set(url, updatedItem);
            
        } catch (error) {
            setSeoData(prevData => prevData.map(item => item.url === url ? { ...item, status: 'analyzed' } : item));
            throw error;
        }
    };

    const handleBulkUpdate = async (): Promise<void> => {
        if (!wpCreds) {
            setIsAwaitingWpCreds(true);
            return;
        }
        
        const urlsToUpdate = (Array.from(selectedUrls) as string[]).filter(url => {
            const page = seoData.find(p => p.url === url);
            return page && page.status === 'analyzed' && page.pendingSuggestion;
        });
        
        if (urlsToUpdate.length === 0) return;

        setIsUpdatingWp(true);
        setWpUpdateError(null);

        const promises = urlsToUpdate.map(url => {
            const page = seoData.find(p => p.url === url)!;
            return handleUpdateSeo(url, page.pendingSuggestion!.title, page.pendingSuggestion!.description)
                .catch(e => {
                    console.error(`Failed to update ${url}:`, e);
                });
        });
        
        await Promise.all(promises);
        setIsUpdatingWp(false);
        setSelectedUrls(new Set()); 
    }

    const handleReviewSync = async (items: { url: string; title: string; description: string }[]) => {
        if (!wpCreds) {
            setIsAwaitingWpCreds(true);
            return;
        }

        setIsUpdatingWp(true);
        setWpUpdateError(null);

        const promises = items.map(item => {
            return handleUpdateSeo(item.url, item.title, item.description)
                .catch(e => {
                    console.error(`Failed to update ${item.url}:`, e);
                });
        });
        
        await Promise.all(promises);
        setIsUpdatingWp(false);
    };

    const handleBulkAnalyze = () => {
        const toAnalyze = (Array.from(selectedUrls) as string[]).filter(url => {
            const p = seoData.find(page => page.url === url);
            return p && (p.status === 'discovered' || p.status === 'scanned' || p.status === 'error');
        });
        if (toAnalyze.length === 0) return;
        runAutomatedAnalysis(toAnalyze, 'analyze');
    };

    const handleBulkRewrite = () => {
         const toRewrite = (Array.from(selectedUrls) as string[]).filter(url => {
            const p = seoData.find(page => page.url === url);
            return p && (p.status === 'analyzed' || p.status === 'synced');
        });
        if (toRewrite.length === 0) return;
        runAutomatedAnalysis(toRewrite, 'regenerate');
    };
    
    const handleSaveWpCreds = (creds: WordPressCreds) => {
        setWpCreds(creds);
        setIsAwaitingWpCreds(false);
    };

    const activeDetailData = useMemo(() => {
        return seoData.find(d => d.url === activeDetailUrl) || null;
    }, [activeDetailUrl, seoData]);

    const selectionStats = useMemo(() => {
        let analyze = 0, rewrite = 0, update = 0;
        selectedUrls.forEach(url => {
            const p = seoData.find(page => page.url === url);
            if (!p) return;
            if (p.status === 'discovered' || p.status === 'scanned' || p.status === 'error') analyze++;
            if (p.status === 'analyzed' || p.status === 'synced') rewrite++;
            if (p.status === 'analyzed' && p.pendingSuggestion) update++;
        });
        return { analyze, rewrite, update };
    }, [selectedUrls, seoData]);

    return (
        <div className="min-h-screen text-slate-200 font-sans flex flex-col">
            <Header isValidApi={hasValidApiConfig} showReviewButton={pagesForReview.length > 0} onSwitchView={setViewMode} currentView={viewMode} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow flex flex-col relative pb-32">
                 <ApiConfig 
                    configs={aiConfigs}
                    onAddConfig={handleAddConfig}
                    onRemoveConfig={handleRemoveConfig}
                    onUpdateValidation={handleUpdateConfigValidation}
                    isDisabled={isBusy} 
                />
                
                {seoData.length === 0 && !isBusy && (
                    <UrlInput 
                        onCrawl={handleCrawl} 
                        onProcessFile={handleProcessFile}
                        isLoading={isBusy} 
                        isApiConfigured={hasValidApiConfig} 
                    />
                )}
                
                {error && <div className="mt-6 p-4 glass-panel border-red-500/50 text-red-300 rounded-xl">{error}</div>}
                
                {isBusy && progress && (
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 font-bold animate-pulse">
                            {progress.stage}
                        </p>
                        <ProgressBar 
                           progress={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}
                           label={`${processStatus || ''} (${progress.processed}/${progress.total})`}
                       />
                    </div>
                )}
                
                {viewMode === 'dashboard' && seoData.length > 0 && (
                    <>
                        <Dashboard data={seoData} onSwitchView={setViewMode} showReviewButton={pagesForReview.length > 0} />
                        <div className="flex-grow grid grid-cols-12 gap-6 mt-6 min-h-[600px] relative">
                            {/* Site Structure Sidebar (Hidden on small mobile) */}
                            <div className="hidden lg:block col-span-3">
                                <SiteStructurePanel
                                    clusters={topicClusters}
                                    activeCluster={filter.activeCluster}
                                    onSelectCluster={(topic) => setFilter(f => ({ ...f, activeCluster: topic }))}
                                />
                            </div>
                            
                            {/* Main Data Table */}
                            <div className={`transition-all duration-300 ${activeDetailUrl ? 'col-span-12 lg:col-span-5' : 'col-span-12 lg:col-span-9'}`}>
                                <SeoDataTable
                                    data={filteredData}
                                    onRowClick={handleRowClick}
                                    activeUrl={activeDetailUrl}
                                    selectedUrls={selectedUrls}
                                    onToggleSelection={handleToggleSelection}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>
                            
                            {/* Detail Panel - Overlay on Mobile, Sidebar on Desktop */}
                            {activeDetailUrl && (
                                <div className="fixed inset-0 z-50 lg:static lg:z-auto lg:col-span-4 lg:inset-auto">
                                    <DetailPanel data={activeDetailData} onClose={() => setActiveDetailUrl(null)} onUpdate={handleUpdateSeo} isUpdating={isUpdatingWp} updateError={wpUpdateError} />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {viewMode === 'review' && (
                    <ReviewAndSyncPanel
                        pages={pagesForReview}
                        onSync={handleReviewSync}
                        isSyncing={isUpdatingWp}
                        syncError={wpUpdateError}
                        onDiscard={(url) => setSeoData(prev => prev.map(p => p.url === url ? { ...p, pendingSuggestion: undefined } : p))}
                    />
                )}
            </main>
            
            {selectedUrls.size > 0 && viewMode === 'dashboard' && (
                <BulkOperationsPanel 
                    selectedCount={selectedUrls.size}
                    selectableForAnalysisCount={selectionStats.analyze}
                    selectableForRewriteCount={selectionStats.rewrite}
                    selectableForUpdateCount={selectionStats.update}
                    onBulkAnalyze={handleBulkAnalyze}
                    onBulkRewrite={handleBulkRewrite}
                    onBulkUpdate={handleBulkUpdate}
                    isBusy={isBusy}
                />
            )}
            
            {isAwaitingWpCreds && (
                <WordPressCredsModal 
                    onSave={handleSaveWpCreds} 
                    onClose={() => setIsAwaitingWpCreds(false)} 
                    initialUrl={activeDetailData?.url}
                />
            )}
            
            <Footer />
        </div>
    );
};

export default App;
