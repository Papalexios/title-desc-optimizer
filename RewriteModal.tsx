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
}

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

type UpdateStatus = 'idle' | 'loading' | 'success' | 'error';

export const RewriteModal: React.FC<RewriteModalProps> = ({ url, originalData, suggestions, onClose, onUpdate, isUpdating, updateError }) => {
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
    }, [isUpdating, updateError]);


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
                return 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed';
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-white">AI Rewrite Suggestions</h2>
                    <p className="text-sm text-gray-400 mt-1 truncate">{url}</p>
                </div>

                <div className="p-6">
                     <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-300 mb-3">Original SEO Analysis</h3>
                         <p className="text-sm text-gray-400 mb-3">The AI determined the primary topic of this page is: <span className="font-semibold text-indigo-300">{originalData.topic}</span></p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-400">Title Grade:</span>
                                    <GradeBadge grade={originalData.titleGrade} />
                                </div>
                                <p className="text-gray-400">{originalData.titleFeedback}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-400">Description Grade:</span>
                                    <GradeBadge grade={originalData.descriptionGrade} />
                                </div>
                                <p className="text-gray-400">{originalData.descriptionFeedback}</p>
                            </div>
                        </div>
                    </div>
                
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                onClick={() => updateStatus === 'idle' && setSelectedSuggestion(suggestion)}
                                className={`rounded-lg transition-all duration-200 flex flex-col justify-between h-full ${updateStatus !== 'idle' ? 'opacity-70' : 'cursor-pointer'} ${selectedSuggestion === suggestion ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                            >
                                <div className="p-4">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-base font-semibold text-indigo-300 mb-2">Suggestion {index + 1}</h3>
                                        {selectedSuggestion === suggestion && <CheckCircleIcon />}
                                    </div>
                                    <p className="text-sm font-medium text-gray-200">{suggestion.title}</p>
                                    <p className="text-xs text-gray-400 mt-2">{suggestion.description}</p>
                                </div>
                                <div className="p-4 mt-2 border-t border-gray-600/50 bg-black/20 rounded-b-lg">
                                    <p className="text-xs text-gray-400 italic">
                                        <span className="font-semibold text-gray-300 not-italic">Rationale: </span>
                                        {suggestion.rationale}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">SERP Preview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm font-semibold text-gray-500 uppercase mb-2 text-center">Original</p>
                                <div className="bg-white dark:bg-gray-900 rounded-md shadow-md">
                                    <SerpPreview 
                                        url={url} 
                                        title={originalData.title} 
                                        description={originalData.description} 
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-500 uppercase mb-2 text-center">New Suggestion</p>
                                <div className={`bg-white dark:bg-gray-900 rounded-md shadow-md transition-opacity duration-300 ${!selectedSuggestion ? 'opacity-50' : ''}`}>
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

                <div className="p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800 z-10">
                    {updateStatus === 'error' && (
                        <div className="text-center mb-2 text-red-300 bg-red-900/50 p-2 rounded-md">
                            <strong>Error:</strong> {updateError}
                        </div>
                    )}
                    <div className="flex justify-end gap-4">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50" disabled={isUpdating}>Cancel</button>
                        <button
                            id="rewrite-button"
                            onClick={handleUpdateClick}
                            disabled={!selectedSuggestion || updateStatus !== 'idle'}
                            className={`flex items-center justify-center gap-2 px-6 py-2 text-white font-semibold rounded-lg transition-colors ${getButtonClass()}`}
                        >
                            {getButtonContent()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
