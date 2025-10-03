
import React, { useState, useEffect } from 'react';
import { RewriteSuggestion, SeoAnalysis } from '../types';
import { GradeBadge } from './common/GradeBadge';
import { SerpPreview } from './common/SerpPreview';
import { Spinner } from './common/Spinner';

interface RewriteModalProps {
    url: string;
    originalData: SeoAnalysis;
    suggestions: RewriteSuggestion[];
    onClose: () => void;
    onUpdate: (url: string, newTitle: string, newDescription: string) => Promise<void>;
    isUpdating: boolean;
    updateError: string | null;
    queuePosition?: number;
    queueTotal?: number;
    generationError?: string;
    onStopBatch: () => void;
}

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const AlertTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);


type UpdateStatus = 'idle' | 'loading' | 'success' | 'error';

export const RewriteModal: React.FC<RewriteModalProps> = ({ 
    url, originalData, suggestions, onClose, onUpdate, isUpdating, 
    updateError, queuePosition, queueTotal, generationError, onStopBatch 
}) => {
    const [selectedSuggestion, setSelectedSuggestion] = useState<RewriteSuggestion | null>(suggestions[0] || null);
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');

    useEffect(() => {
        if (isUpdating) {
            setUpdateStatus('loading');
        } else if (updateError) {
            setUpdateStatus('error');
        } else if (updateStatus === 'loading' && !isUpdating && !updateError) {
            setUpdateStatus('success');
             setTimeout(() => {
                onClose();
            }, 1500); // Close modal after success message
        }
    }, [isUpdating, updateError, updateStatus, onClose]);

    // Reset local state when the URL prop changes (for batch processing)
    useEffect(() => {
        setSelectedSuggestion(suggestions[0] || null);
        setUpdateStatus('idle');
    }, [url, suggestions]);


    const handleUpdateClick = async () => {
        if (selectedSuggestion) {
            try {
                await onUpdate(url, selectedSuggestion.title, selectedSuggestion.description);
            } catch (e) {
                // Error state is handled by the parent via props
            }
        }
    };
    
    const getButtonContent = () => {
        switch (updateStatus) {
            case 'loading':
                return <><Spinner /> Updating...</>;
            case 'success':
                return 'Success!';
            case 'error':
                 return 'Update Failed';
            default:
                return 'Update on WordPress';
        }
    };

    const getButtonClass = () => {
         switch (updateStatus) {
            case 'loading':
                return 'bg-yellow-600 cursor-wait';
            case 'success':
                return 'bg-green-600';
            case 'error':
                 return 'bg-red-600';
            default:
                return 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-500 disabled:cursor-not-allowed';
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 shrink-0">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">AI Rewrite Suggestions</h2>
                            <p className="text-sm text-slate-400 mt-1 truncate" title={url}>{url}</p>
                        </div>
                        {queuePosition && queueTotal && queueTotal > 1 && (
                            <span className="text-sm font-semibold text-slate-300 bg-slate-700/50 px-3 py-1.5 rounded-full whitespace-nowrap">
                                {`Processing ${queuePosition} of ${queueTotal}`}
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto">
                     {generationError ? (
                        <div className="p-8 text-center">
                            <AlertTriangleIcon />
                            <h3 className="mt-4 text-xl font-bold text-red-300">Suggestion Generation Failed</h3>
                            <p className="mt-2 text-slate-300 bg-slate-900/50 p-4 rounded-md border border-slate-700">{generationError}</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <h3 className="text-lg font-semibold text-slate-300 mb-3">Original SEO Analysis</h3>
                                <p className="text-sm text-slate-400 mb-3">The AI determined the primary topic of this page is: <span className="font-semibold text-indigo-300">{originalData.topic}</span></p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-slate-400">Title Grade:</span>
                                            <GradeBadge grade={originalData.titleGrade} />
                                        </div>
                                        <p className="text-slate-400">{originalData.titleFeedback}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-slate-400">Description Grade:</span>
                                            <GradeBadge grade={originalData.descriptionGrade} />
                                        </div>
                                        <p className="text-slate-400">{originalData.descriptionFeedback}</p>
                                    </div>
                                </div>
                            </div>
                        
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        onClick={() => updateStatus === 'idle' && setSelectedSuggestion(suggestion)}
                                        className={`rounded-lg transition-all duration-200 flex flex-col justify-between h-full ${updateStatus !== 'idle' ? 'opacity-70' : 'cursor-pointer'} ${selectedSuggestion === suggestion ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-slate-700/50 hover:bg-slate-700'}`}
                                    >
                                        <div className="p-4">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-base font-semibold text-indigo-300 mb-2">Suggestion {index + 1}</h3>
                                                {selectedSuggestion === suggestion && <CheckCircleIcon />}
                                            </div>
                                            <p className="text-sm font-medium text-slate-200">{suggestion.title}</p>
                                            <p className="text-xs text-slate-400 mt-2">{suggestion.description}</p>
                                        </div>
                                        <div className="p-4 mt-2 border-t border-slate-600/50 bg-black/20 rounded-b-lg">
                                            <p className="text-xs text-slate-400 italic">
                                                <span className="font-semibold text-slate-300 not-italic">Rationale: </span>
                                                {suggestion.rationale}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                <h3 className="text-lg font-semibold text-slate-300 mb-2">SERP Preview</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 uppercase mb-2 text-center">Original</p>
                                        <div className="bg-white dark:bg-slate-900 rounded-md shadow-md">
                                            <SerpPreview 
                                                url={url} 
                                                title={originalData.title} 
                                                description={originalData.description} 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-green-500 uppercase mb-2 text-center">New Suggestion</p>
                                        <div className={`bg-white dark:bg-slate-900 rounded-md shadow-md transition-opacity duration-300 ${!selectedSuggestion ? 'opacity-50' : ''}`}>
                                            <SerpPreview 
                                                url={url} 
                                                title={selectedSuggestion?.title ?? "Select a suggestion"} 
                                                description={selectedSuggestion?.description ?? "Select a suggestion to see a preview."} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 z-10 shrink-0">
                    {generationError ? (
                        <div className="flex justify-end gap-4">
                            <button onClick={onStopBatch} className="px-4 py-2 bg-red-800 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">Stop Batch</button>
                            <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">Skip & Continue</button>
                        </div>
                    ) : (
                        <>
                            {updateStatus === 'error' && (
                                <div className="text-center mb-2 text-red-300 bg-red-900/50 p-2 rounded-md">
                                    <strong>Error:</strong> {updateError}
                                </div>
                            )}
                            <div className="flex justify-end gap-4">
                                <button onClick={onClose} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50" disabled={isUpdating}>Cancel</button>
                                <button
                                    id="rewrite-button"
                                    onClick={handleUpdateClick}
                                    disabled={!selectedSuggestion || updateStatus !== 'idle'}
                                    className={`flex items-center justify-center gap-2 px-6 py-2 text-white font-semibold rounded-lg transition-colors ${getButtonClass()}`}
                                >
                                    {getButtonContent()}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
