import React from 'react';
import { SeoAnalysis } from '../types';
import { GradeBadge } from './common/GradeBadge';

interface SeoDataTableProps {
    data: SeoAnalysis[];
    selectedUrls: Set<string>;
    syncedUrls: Set<string>;
    analyzedUrls: Set<string>;
    onSelectionChange: (url: string, isSelected: boolean) => void;
    onRewriteSingle: (url: string) => void;
}

const CheckmarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const PenIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L13 12l-4 4-2.293-2.293a1 1 0 010-1.414L10 8.586l2.293-2.293a1 1 0 011.414 0z" />
    </svg>
);

export const SeoDataTable: React.FC<SeoDataTableProps> = ({ data, selectedUrls, syncedUrls, analyzedUrls, onSelectionChange, onRewriteSingle }) => {
    if (data.length === 0) {
        return (
            <div className="mt-8 text-center bg-slate-800/50 border border-slate-700 rounded-lg p-12">
                <h3 className="text-xl font-semibold text-slate-300">No Results Found</h3>
                <p className="text-slate-400 mt-2">Adjust your filter or search term to find what you're looking for.</p>
            </div>
        );
    }
    
    return (
        <div className="mt-4">
            <div className="space-y-4">
                {data.map((item) => {
                    const isSynced = syncedUrls.has(item.url);
                    const isSelected = selectedUrls.has(item.url);
                    const isAnalyzed = analyzedUrls.has(item.url);

                    return (
                        <div key={item.url} className={`bg-slate-800/50 rounded-xl border transition-all duration-200 ${isSelected && !isSynced ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-700 hover:border-slate-600'}`}>
                            <div className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-indigo-600 focus:ring-indigo-500 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                            checked={isSelected || isSynced}
                                            disabled={isSynced}
                                            onChange={(e) => onSelectionChange(item.url, e.target.checked)}
                                            aria-label={`Select ${item.url}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-indigo-300 truncate" title={item.url}>{item.url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 sm:mt-0 sm:ml-4">
                                        {isAnalyzed && item.grade !== undefined && <GradeBadge grade={item.grade} />}
                                        {isSynced ? (
                                            <span className="flex items-center px-3 py-1.5 bg-green-500/20 text-green-300 text-sm font-semibold rounded-md border border-green-500/30">
                                                <CheckmarkIcon /> Synced
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => onRewriteSingle(item.url)}
                                                disabled={!isAnalyzed}
                                                title={!isAnalyzed ? 'Analyze this page first to enable rewriting' : 'Rewrite with AI'}
                                                className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-md transition-colors disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                                            >
                                                <PenIcon /> Rewrite
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 pl-9 space-y-3">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Title</p>
                                        <p className="text-base text-slate-200">{item.title || '(No title found)'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Description</p>
                                        <p className="text-sm text-slate-300">{item.description || '(No description found)'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {isAnalyzed && item.grade !== undefined ? (
                                <div className="bg-slate-900/50 p-4 border-t border-slate-700 rounded-b-xl">
                                    <h3 className="text-sm font-bold text-slate-200 mb-3 ml-1">AI Analysis Breakdown</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-800/60 p-3 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-slate-300">Title Analysis</p>
                                                <GradeBadge grade={item.titleGrade!} />
                                            </div>
                                            <p className="text-sm text-slate-400">{item.titleFeedback}</p>
                                        </div>
                                        <div className="bg-slate-800/60 p-3 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-slate-300">Description Analysis</p>
                                                <GradeBadge grade={item.descriptionGrade!} />
                                            </div>
                                            <p className="text-sm text-slate-400">{item.descriptionFeedback}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-900/50 px-4 py-3 border-t border-slate-700 rounded-b-xl text-center">
                                    <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                                        <SparklesIcon/> Select this page and click "Analyze Selected" to get an AI-powered SEO grade.
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
