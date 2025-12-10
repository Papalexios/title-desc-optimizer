import React, { useState, useEffect } from 'react';
import { SeoAnalysis, RewriteSuggestion } from '../types';
import { Spinner } from './common/Spinner';
import { GradeBadge } from './common/GradeBadge';
import { SerpPreview } from './common/SerpPreview';

interface DetailPanelProps {
    data: SeoAnalysis | null;
    onClose: () => void;
    onUpdate: (url: string, newTitle: string, newDescription: string) => Promise<void>;
    isUpdating: boolean;
    updateError: string | null;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${active ? 'border-indigo-400 text-indigo-300 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/30'}`}>
        {children}
    </button>
);

const InfoCard: React.FC<{ title: string; value?: string | number; grade?: number; children?: React.ReactNode; icon?: React.ReactNode }> = ({ title, value, grade, children, icon }) => (
    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                {icon}
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
            </div>
            {grade !== undefined && <GradeBadge grade={grade} />}
        </div>
        {value !== undefined && <p className="text-base text-slate-100 font-medium">{value}</p>}
        {children}
    </div>
);

const SparkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>;

export const DetailPanel: React.FC<DetailPanelProps> = ({ data, onClose, onUpdate, isUpdating, updateError }) => {
    const [activeTab, setActiveTab] = useState<'analysis' | 'rewrite'>('rewrite');
    const [selectedSuggestion, setSelectedSuggestion] = useState<RewriteSuggestion | null>(null);

    useEffect(() => {
        if (data?.suggestions && data.suggestions.length > 0) {
            setSelectedSuggestion(data.suggestions[0]);
            setActiveTab('rewrite');
        } else {
            setActiveTab('analysis');
        }
    }, [data]);

    if (!data) return null;

    const handleUpdateClick = async () => {
        if (selectedSuggestion) {
            await onUpdate(data.url, selectedSuggestion.title, selectedSuggestion.description);
        }
    };
    
    return (
        <div className="bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 h-full flex flex-col shadow-2xl relative overflow-hidden">
            {/* Background SOTA Effect */}
            <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="p-5 border-b border-slate-700 z-10 bg-slate-800/90">
                <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">SOTA ANALYSIS</span>
                             {data.status === 'synced' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">SYNCED</span>}
                        </div>
                        <h3 className="text-lg font-bold text-white truncate leading-tight" title={data.url}>{data.url}</h3>
                        <p className="text-xs text-slate-400 truncate mt-1 font-mono" title={data.title}>{data.title || '(No title found)'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            {data.status === 'analyzed' && (
                 <div className="flex border-b border-slate-700 bg-slate-800/50 z-10">
                    <TabButton active={activeTab === 'rewrite'} onClick={() => setActiveTab('rewrite')}>
                        <span className="flex items-center gap-2"><SparkIcon /> AI Rewrite</span>
                    </TabButton>
                    <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')}>Deep Audit</TabButton>
                </div>
            )}
            
            <div className="overflow-y-auto flex-grow p-5 space-y-5 z-10 custom-scrollbar">
                 {data.status === 'discovered' || data.status === 'scanned' && (
                    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                        <div className="animate-pulse bg-slate-700 h-12 w-12 rounded-full mb-4"></div>
                        <p className="text-slate-300 mb-2 font-medium">Pending Analysis</p>
                        <p className="text-slate-500 text-sm max-w-xs">The AI pipeline is currently processing this URL. Data will stream in shortly.</p>
                    </div>
                )}
                
                {data.status === 'analyzing' && (
                    <div className="flex flex-col justify-center items-center h-full space-y-4">
                        <Spinner />
                        <p className="text-indigo-300 animate-pulse text-sm">Generating SOTA Insights...</p>
                    </div>
                )}
                
                {data.status === 'error' && data.analysisError && (
                    <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        <div>
                            <p className="text-red-300 text-sm font-semibold">Analysis Failed</p>
                            <p className="text-red-400 text-xs mt-1">{data.analysisError}</p>
                        </div>
                    </div>
                )}

                {(data.status === 'analyzed' || data.status === 'synced' || data.status === 'updating') && activeTab === 'analysis' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-4">
                            <InfoCard title="Priority Score" value={data.priorityScore} />
                            <InfoCard title="Snippet Chance" value={`${data.featuredSnippetPotential?.score || 0}%`} />
                        </div>
                        
                        <InfoCard title="Search Intent" value={data.searchIntent?.toUpperCase() || 'UNKNOWN'} />
                        
                        <InfoCard title="Title Analysis" grade={data.titleGrade}>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{data.titleFeedback}</p>
                        </InfoCard>
                        
                        <InfoCard title="Description Analysis" grade={data.descriptionGrade}>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{data.descriptionFeedback}</p>
                        </InfoCard>
                        
                        <InfoCard title="Content Depth" grade={data.contentDepth?.grade}>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                                <span><strong className="text-white">{data.contentDepth?.wordCount}</strong> words</span>
                                <span><strong className="text-white">{data.contentDepth?.topicalCoverage}%</strong> coverage</span>
                            </div>
                            {data.contentDepth?.contentGaps && data.contentDepth.contentGaps.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                    <p className="text-xs text-red-300 font-bold uppercase mb-2">Missing Topics (Content Gaps)</p>
                                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                                        {data.contentDepth.contentGaps.map((gap, i) => <li key={i}>{gap}</li>)}
                                    </ul>
                                </div>
                            )}
                        </InfoCard>

                        {data.aeoOptimization?.paaQuestions && (
                            <InfoCard title="Answer Engine Optimization (AEO)">
                                <p className="text-xs text-slate-500 mb-2">Target these "People Also Ask" questions:</p>
                                <ul className="space-y-2">
                                    {data.aeoOptimization.paaQuestions.map((q, i) => (
                                        <li key={i} className="text-xs text-indigo-200 bg-indigo-900/30 p-2 rounded border border-indigo-500/20 flex gap-2">
                                            <span className="text-indigo-400 font-bold">Q:</span> {q}
                                        </li>
                                    ))}
                                </ul>
                            </InfoCard>
                        )}

                        <InfoCard title="Semantic Keywords">
                             <div className="flex flex-wrap gap-1.5 mt-2">
                                {data.semanticKeywords?.map(kw => <span key={kw} className="text-xs bg-slate-700/50 border border-slate-600 text-slate-300 px-2 py-1 rounded-md">{kw}</span>)}
                            </div>
                        </InfoCard>
                    </div>
                )}

                {(data.status === 'analyzed' || data.status === 'synced' || data.status === 'updating') && activeTab === 'rewrite' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="space-y-4">
                        {(data.suggestions || []).map((suggestion, index) => (
                             <div 
                                key={index} 
                                onClick={() => setSelectedSuggestion(suggestion)} 
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border relative ${selectedSuggestion === suggestion ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-700/30 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'}`}
                             >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`text-sm font-bold uppercase tracking-wider ${selectedSuggestion === suggestion ? 'text-indigo-300' : 'text-slate-400'}`}>Suggestion {index+1}</h4>
                                    {selectedSuggestion === suggestion && <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Title</p>
                                        <p className="text-sm font-medium text-white">{suggestion.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Description</p>
                                        <p className="text-sm text-slate-300 leading-relaxed">{suggestion.description}</p>
                                    </div>
                                </div>
                                {suggestion.expectedCtrLift && (
                                    <div className="mt-3 pt-3 border-t border-slate-600/30 flex items-center gap-2">
                                        <span className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-500/20">🚀 {suggestion.expectedCtrLift} CTR</span>
                                    </div>
                                )}
                             </div>
                        ))}
                        </div>
                        
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Live SERP Preview</h4>
                             <SerpPreview url={data.url} title={selectedSuggestion?.title ?? data.title} description={selectedSuggestion?.description ?? data.description} />
                        </div>
                    </div>
                )}
            </div>

            {(data.status === 'analyzed' || (data.status === 'updating' && updateError)) && (
                 <div className="p-5 border-t border-slate-700 bg-slate-800/90 z-10">
                    {updateError && <div className="text-center mb-3 text-red-300 text-sm bg-red-900/30 border border-red-500/30 p-2 rounded-lg">{updateError}</div>}
                    <button 
                        onClick={handleUpdateClick} 
                        disabled={isUpdating || !selectedSuggestion}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/20 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 transition-all transform active:scale-[0.98]"
                    >
                        {isUpdating ? <Spinner /> : 'Sync to WordPress'}
                    </button>
                </div>
            )}
        </div>
    );
};