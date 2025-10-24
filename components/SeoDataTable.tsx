import React from 'react';
import { SeoAnalysis } from '../types';
import { GradeBadge } from './common/GradeBadge';
import { Spinner } from './common/Spinner';

interface SeoDataTableProps {
    data: SeoAnalysis[];
    selectedUrls: Set<string>;
    onSelectionChange: (url: string, isSelected: boolean) => void;
    onOpenRewriteModal: (url: string) => void;
}

const CheckmarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const PenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L13 12l-4 4-2.293-2.293a1 1 0 010-1.414L10 8.586l2.293-2.293a1 1 0 011.414 0z" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const StatusBadge: React.FC<{ status: SeoAnalysis['status'] }> = ({ status }) => {
    switch (status) {
        case 'analyzing':
            return <span className="flex items-center text-xs font-bold text-sky-300"><Spinner /> Analyzing...</span>;
        case 'analyzed':
             return <span className="flex items-center text-xs font-bold text-indigo-300"><SparklesIcon /> Ready to Review</span>;
        case 'synced':
            return <span className="flex items-center text-xs font-bold text-green-400"><CheckmarkIcon /> Synced</span>;
        case 'updating':
            return <span className="flex items-center text-xs font-bold text-yellow-300"><Spinner /> Updating...</span>;
        case 'error':
            return <span className="flex items-center text-xs font-bold text-red-400"><ErrorIcon /> Error</span>;
        default: // 'scanned' or 'crawled'
            return null;
    }
};

const IssueTag: React.FC<{ issue: string }> = ({ issue }) => {
    const getTagColor = () => {
        if (issue.includes('Missing')) return 'bg-red-500/20 text-red-300 border-red-500/40';
        if (issue.includes('Too Long') || issue.includes('Too Short')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
        if (issue.includes('Duplicate')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
        return 'bg-slate-600/50 text-slate-300 border-slate-500/40';
    };

    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${getTagColor()}`}>
            {issue}
        </span>
    );
};


export const SeoDataTable: React.FC<SeoDataTableProps> = ({ data, selectedUrls, onSelectionChange, onOpenRewriteModal }) => {
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
                    const isSelected = selectedUrls.has(item.url);
                    const isActionable = item.status === 'scanned' || item.status === 'error';

                    return (
                        <div key={item.url} className={`bg-slate-800/50 rounded-xl border transition-all duration-200 ${isSelected && isActionable ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-700 hover:border-slate-600'}`}>
                            <div className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-indigo-600 focus:ring-indigo-500 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                            checked={isSelected || item.status === 'synced'}
                                            disabled={!isActionable}
                                            onChange={(e) => onSelectionChange(item.url, e.target.checked)}
                                            aria-label={`Select ${item.url}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-indigo-300 truncate" title={item.url}>{item.url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 sm:mt-0 sm:ml-4">
                                        {item.grade !== undefined && <GradeBadge grade={item.grade} />}
                                        <StatusBadge status={item.status} />
                                        {item.status === 'analyzed' && (
                                            <button 
                                                onClick={() => onOpenRewriteModal(item.url)}
                                                className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-md transition-colors"
                                            >
                                                <PenIcon /> Review & Rewrite
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
                                    {item.issues.length > 0 && (
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1.5">Issues Found</p>
                                            <div className="flex flex-wrap gap-2">
                                                {item.issues.map(issue => <IssueTag key={issue} issue={issue} />)}
                                            </div>
                                        </div>
                                    )}
                                    {item.status === 'error' && item.analysisError && (
                                        <div className="mt-2 p-2 bg-red-900/50 border border-red-500/50 rounded-md text-red-300 text-sm">
                                            <strong>Analysis Failed:</strong> {item.analysisError}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {item.status === 'analyzed' && (
                                <div className="bg-slate-900/50 p-4 border-t border-slate-700 rounded-b-xl">
                                    <h3 className="text-sm font-bold text-slate-200 mb-3 ml-1">AI Analysis Summary</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-800/60 p-3 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-slate-300">Title Analysis</p>
                                                {item.titleGrade !== undefined && <GradeBadge grade={item.titleGrade} />}
                                            </div>
                                            <p className="text-sm text-slate-400">{item.titleFeedback}</p>
                                        </div>
                                        <div className="bg-slate-800/60 p-3 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-slate-300">Description Analysis</p>
                                                {item.descriptionGrade !== undefined && <GradeBadge grade={item.descriptionGrade} />}
                                            </div>
                                            <p className="text-sm text-slate-400">{item.descriptionFeedback}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
