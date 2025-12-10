import React, { useState, useMemo, useCallback } from 'react';
import { SeoAnalysis, AiConfig } from '../types';
import { SerpPreview } from './common/SerpPreview';
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
        <div className={`p-4 rounded-xl border-2 transition-colors ${isChecked ? 'bg-slate-800/80 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex items-start gap-4">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(page.url)}
                    className="mt-1 h-5 w-5 rounded bg-slate-900 border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-indigo-300 truncate">{page.url}</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                        {/* Original */}
                        <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Original</p>
                            <div className="p-2 rounded-md bg-slate-900/50 border border-slate-700/50">
                                <p className="text-sm font-medium text-slate-300 truncate" title={page.title}>{page.title}</p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{page.description}</p>
                            </div>
                        </div>
                        {/* Suggestion */}
                        <div>
                             <p className="text-xs font-semibold uppercase text-green-500 mb-1">AI Suggestion</p>
                             <div className="p-2 rounded-md bg-green-900/20 border border-green-500/30">
                                <p className="text-sm font-medium text-green-300 truncate" title={page.pendingSuggestion?.title}>{page.pendingSuggestion?.title}</p>
                                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{page.pendingSuggestion?.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                         <div className="relative group">
                            <button 
                                onClick={handleShowDiff}
                                disabled={isLoadingDiff || !aiConfig}
                                className="flex items-center text-xs font-semibold text-sky-300 hover:text-sky-200 disabled:opacity-50"
                            >
                                {isLoadingDiff ? <Spinner /> : <InfoIcon />}
                                See why it's better
                            </button>
                             {diff && (
                                <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-lg z-10 opacity-100 transition-opacity">
                                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                                        {diff.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            )}
                         </div>

                        <button onClick={() => onDiscard(page.url)} className="text-xs font-semibold text-red-400 hover:text-red-300">
                            Discard Suggestion
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
    
    // This is a bit of a hack to get a valid AI config for the semantic diff
    const aiConfigForDiff = useMemo(() => {
        const aiConfigsStr = localStorage.getItem('aiConfigs'); // Assuming App component saves this
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
        <div className="mt-6">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-white">Review & Sync AI Suggestions</h2>
                <p className="text-slate-400 mt-1">Approve the AI-generated meta tags before updating them on your WordPress site.</p>
            </div>
            
            <div className="sticky top-20 bg-slate-900/80 backdrop-blur-sm z-30 py-4 my-6 border-y border-slate-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold text-white">{selectedUrls.size} of {pages.length} selected</p>
                        <button onClick={handleSelectAll} className="text-sm font-semibold text-indigo-300 hover:text-white">Select All</button>
                        <button onClick={handleDeselectAll} className="text-sm font-semibold text-indigo-300 hover:text-white">Deselect All</button>
                    </div>
                     <button
                        onClick={handleSync}
                        disabled={isSyncing || selectedUrls.size === 0}
                        className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {isSyncing ? <Spinner /> : `Sync ${selectedUrls.size} Changes to WordPress`}
                    </button>
                </div>
                {syncError && <p className="text-center text-red-300 mt-2">{syncError}</p>}
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