
import React, { useState, useMemo } from 'react';
import { SeoAnalysis, AiConfig } from '../types';
import { Spinner } from './common/Spinner';
import { getSemanticDiff } from '../services/aiService';

interface ReviewItemProps {
    page: SeoAnalysis;
    isChecked: boolean;
    onToggle: (url: string) => void;
    onDiscard: (url: string) => void;
    aiConfig: AiConfig | undefined; // For semantic diff
}

const InfoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);


const ReviewItem: React.FC<ReviewItemProps> = ({ page, isChecked, onToggle, onDiscard, aiConfig }) => {
    const [diff, setDiff] = useState<string[] | null>(null);
    const [isLoadingDiff, setIsLoadingDiff] = useState(false);

    const handleShowDiff = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (diff || !aiConfig || !page.pendingSuggestion) return;

        setIsLoadingDiff(true);
        const result = await getSemanticDiff(
            { title: page.title, description: page.description },
            { title: page.pendingSuggestion.title, description: page.pendingSuggestion.description },
            aiConfig
        );
        setDiff(result);
        setIsLoadingDiff(false);
    };

    return (
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${isChecked ? 'bg-indigo-900/20 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}>
            <div className="flex items-start gap-4">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(page.url)}
                    className="mt-1 h-5 w-5 rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                />
                <div className="flex-grow min-w-0">
                    <p className="font-bold text-sm text-indigo-300 truncate mb-4">{page.url}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original */}
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-slate-500">Original</p>
                            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5">
                                <p className="text-sm font-medium text-slate-400 truncate opacity-80" title={page.title}>{page.title}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{page.description}</p>
                            </div>
                        </div>
                        {/* Suggestion */}
                        <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase text-emerald-500">SOTA Suggestion</p>
                             <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 blur-[30px] rounded-full"></div>
                                <p className="text-sm font-bold text-emerald-300 truncate relative z-10" title={page.pendingSuggestion?.title}>{page.pendingSuggestion?.title}</p>
                                <p className="text-xs text-emerald-200/70 mt-1 line-clamp-2 relative z-10">{page.pendingSuggestion?.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                         <div className="relative group">
                            <button 
                                onClick={handleShowDiff}
                                disabled={isLoadingDiff || !aiConfig}
                                className="flex items-center text-xs font-bold text-sky-400 hover:text-sky-300 disabled:opacity-50 uppercase tracking-wide bg-sky-900/20 px-3 py-1.5 rounded-full border border-sky-500/20"
                            >
                                {isLoadingDiff ? <Spinner /> : <InfoIcon />}
                                Why is this better?
                            </button>
                             {diff && (
                                <div className="absolute bottom-full left-0 mb-2 w-72 p-4 glass-panel rounded-xl shadow-2xl z-20 animate-fadeIn">
                                    <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                                        {diff.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}
                         </div>

                        <button onClick={() => onDiscard(page.url)} className="text-xs font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wide px-3 py-1.5 hover:bg-rose-900/20 rounded-full transition-colors">
                            Discard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface ReviewAndSyncPanelProps {
    pages: SeoAnalysis[];
    onSync: (items: { url: string; title: string; description: string }[]) => Promise<void>;
    isSyncing: boolean;
    syncError: string | null;
    onDiscard: (url: string) => void;
}

export const ReviewAndSyncPanel: React.FC<ReviewAndSyncPanelProps> = ({ pages, onSync, isSyncing, syncError, onDiscard }) => {
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => new Set(pages.map(p => p.url)));
    
    const aiConfigForDiff = useMemo(() => {
        const aiConfigsStr = localStorage.getItem('aiConfigs');
        if (aiConfigsStr) {
            const configs: AiConfig[] = JSON.parse(aiConfigsStr);
            return configs.find(c => c.isValid);
        }
        return undefined;
    }, []);

    const handleToggle = (url: string) => {
        setSelectedUrls(prev => {
            const newSet = new Set(prev);
            if (newSet.has(url)) {
                newSet.delete(url);
            } else {
                newSet.add(url);
            }
            return newSet;
        });
    };

    const handleSync = () => {
        const itemsToUpdate = pages
            .filter(p => selectedUrls.has(p.url) && p.pendingSuggestion)
            .map(p => ({ url: p.url, title: p.pendingSuggestion!.title, description: p.pendingSuggestion!.description }));
        
        if (itemsToUpdate.length > 0) {
            onSync(itemsToUpdate);
        }
    };
    
    const handleSelectAll = () => setSelectedUrls(new Set(pages.map(p => p.url)));
    const handleDeselectAll = () => setSelectedUrls(new Set());


    return (
        <div className="mt-6 pb-32">
            <div className="glass-panel p-6 rounded-2xl mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">Sync Gateway</h2>
                <p className="text-slate-400 mt-1">Review AI optimizations before pushing to production.</p>
            </div>
            
            <div className="sticky top-20 z-30 mb-8 glass-panel p-4 rounded-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <p className="text-sm font-bold text-white"><span className="text-indigo-400">{selectedUrls.size}</span> Selected</p>
                    <div className="h-4 w-px bg-white/10"></div>
                    <button onClick={handleSelectAll} className="text-xs font-bold text-slate-400 hover:text-white uppercase">All</button>
                    <button onClick={handleDeselectAll} className="text-xs font-bold text-slate-400 hover:text-white uppercase">None</button>
                </div>
                 <button
                    onClick={handleSync}
                    disabled={isSyncing || selectedUrls.size === 0}
                    className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 transition-all text-sm"
                >
                    {isSyncing ? <Spinner /> : `Push ${selectedUrls.size} Changes Live`}
                </button>
                {syncError && <p className="absolute -bottom-8 left-0 right-0 text-center text-rose-400 text-xs">{syncError}</p>}
            </div>

            <div className="space-y-4">
                {pages.map(page => (
                    <ReviewItem 
                        key={page.url}
                        page={page}
                        isChecked={selectedUrls.has(page.url)}
                        onToggle={handleToggle}
                        onDiscard={onDiscard}
                        aiConfig={aiConfigForDiff}
                    />
                ))}
            </div>
        </div>
    );
};
