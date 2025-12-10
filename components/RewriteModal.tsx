import React, { useState, useEffect } from 'react';
import { RewriteSuggestion, SeoAnalysis } from '../types';
import { GradeBadge } from './common/GradeBadge';
import { SerpPreview } from './common/SerpPreview';
import { Spinner } from './common/Spinner';

interface RewriteModalProps {
    data: SeoAnalysis;
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

const RationaleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
const EdgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1.5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1.5 text-sky-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>;


type UpdateStatus = 'idle' | 'loading' | 'success' | 'error';

export const RewriteModal: React.FC<RewriteModalProps> = ({ 
    data, onClose, onUpdate, isUpdating, updateError 
}) => {
    const [selectedSuggestion, setSelectedSuggestion] = useState<RewriteSuggestion | null>(data.suggestions?.[0] || null);
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
    
    // Reset local error state if a new update is attempted
    useEffect(() => {
        setUpdateStatus(isUpdating ? 'loading' : 'idle');
    }, [isUpdating]);


    const handleUpdateClick = async () => {
        if (selectedSuggestion) {
            try {
                await onUpdate(data.url, selectedSuggestion.title, selectedSuggestion.description);
            } catch (e) {
                // Error state is handled by the parent via props, triggering the useEffect above
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
                 return 'Retry Update';
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
                 return 'bg-red-600 hover:bg-red-500';
            default:
                return 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-500 disabled:cursor-not-allowed';
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10 shrink-0">
                    <h2 className="text-xl font-bold text-white">Review & Update SEO</h2>
                    <p className="text-sm text-slate-400 mt-1 truncate" title={data.url}>{data.url}</p>
                </div>

                <div className="overflow-y-auto p-6">
                    <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-300 mb-3">Original SEO Analysis</h3>
                        <p className="text-sm text-slate-400 mb-3">The AI determined the primary topic of this page is: <span className="font-semibold text-indigo-300">{data.primaryTopic || data.topic}</span></p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-slate-400">Title Grade:</span>
                                    <GradeBadge grade={data.titleGrade} />
                                </div>
                                <p className="text-slate-400">{data.titleFeedback}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-slate-400">Description Grade:</span>
                                    <GradeBadge grade={data.descriptionGrade} />
                                </div>
                                <p className="text-slate-400">{data.descriptionFeedback}</p>
                            </div>
                        </div>
                    </div>
                
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(data.suggestions || []).map((suggestion, index) => (
                            <div
                                key={index}
                                onClick={() => updateStatus !== 'loading' && setSelectedSuggestion(suggestion)}
                                className={`rounded-lg transition-all duration-200 flex flex-col justify-between h-full ${updateStatus === 'loading' ? 'opacity-70' : 'cursor-pointer'} ${selectedSuggestion === suggestion ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-slate-700/50 hover:bg-slate-700'}`}
                            >
                                <div className="p-4 flex-grow">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-base font-semibold text-indigo-300 mb-2">Suggestion {index + 1}</h3>
                                        {selectedSuggestion === suggestion && <CheckCircleIcon />}
                                    </div>
                                    <p className="text-sm font-medium text-slate-200">{suggestion.title}</p>
                                    <p className="text-xs text-slate-400 mt-2">{suggestion.description}</p>
                                </div>
                                <div className="p-4 mt-2 border-t border-slate-600/50 bg-black/20 rounded-b-lg space-y-3">
                                    <p className="text-xs text-slate-400 flex items-start">
                                        <RationaleIcon />
                                        <span className="ml-0.5"><span className="font-semibold text-slate-300">Rationale: </span>{suggestion.rationale}</span>
                                    </p>
                                    {suggestion.competitiveDifferentiator && (
                                        <p className="text-xs text-slate-400 flex items-start">
                                            <EdgeIcon />
                                            <span className="ml-0.5"><span className="font-semibold text-green-300">Competitive Edge: </span>{suggestion.competitiveDifferentiator}</span>
                                        </p>
                                    )}
                                    {suggestion.expectedCtrLift && (
                                        <p className="text-xs font-bold text-sky-300 flex items-center">
                                            <ChartIcon />
                                            <span className="ml-0.5"><span className="font-semibold text-sky-400">Est. CTR Lift: </span>{suggestion.expectedCtrLift}</span>
                                        </p>
                                    )}
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
                                        url={data.url} 
                                        title={data.title} 
                                        description={data.description} 
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-500 uppercase mb-2 text-center">New Suggestion</p>
                                <div className={`bg-white dark:bg-slate-900 rounded-md shadow-md transition-opacity duration-300 ${!selectedSuggestion ? 'opacity-50' : ''}`}>
                                    <SerpPreview 
                                        url={data.url} 
                                        title={selectedSuggestion?.title ?? "Select a suggestion"} 
                                        description={selectedSuggestion?.description ?? "Select a suggestion to see a preview."} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800 z-10 shrink-0">
                    {updateStatus === 'error' && (
                        <div className="text-center mb-4 text-red-300 bg-red-900/50 p-2 rounded-md">
                            <strong>Error:</strong> {updateError}
                        </div>
                    )}
                    <div className="flex justify-end gap-4">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50" disabled={isUpdating}>
                            {updateStatus === 'success' ? 'Close' : 'Cancel'}
                        </button>
                        <button
                            id="wp-update-button"
                            onClick={handleUpdateClick}
                            disabled={!selectedSuggestion || updateStatus === 'loading' || updateStatus === 'success'}
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