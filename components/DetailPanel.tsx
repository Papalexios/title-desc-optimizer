
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
    <button onClick={onClick} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-300 flex-1 lg:flex-none text-center ${active ? 'border-indigo-400 text-indigo-300 bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
        {children}
    </button>
);

const InfoCard: React.FC<{ title: string; value?: string | number; grade?: number; children?: React.ReactNode; icon?: React.ReactNode }> = ({ title, value, grade, children, icon }) => (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                {icon}
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
            </div>
            {grade !== undefined && <GradeBadge grade={grade} />}
        </div>
        {value !== undefined && <p className="text-sm text-slate-200 font-semibold">{value}</p>}
        {children}
    </div>
);

const SparkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>;

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
        <div className="fixed inset-0 z-50 lg:static lg:z-auto flex flex-col bg-slate-900/95 lg:bg-slate-900/60 lg:backdrop-blur-xl lg:rounded-2xl lg:border lg:border-white/10 lg:shadow-2xl overflow-hidden h-full">
            {/* Mobile Header Bar */}
            <div className="flex lg:hidden justify-center p-2">
                <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
            </div>

            <div className="p-5 border-b border-white/5 bg-slate-900/20 backdrop-blur-md sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">SOTA Analysis</span>
                             {data.status === 'synced' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest">Synced</span>}
                        </div>
                        <h3 className="text-base font-bold text-white truncate leading-tight" title={data.url}>{data.url}</h3>
                        <p className="text-xs text-slate-400 truncate mt-1 font-mono" title={data.title}>{data.title || '(No title found)'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 bg-slate-800/50 rounded-full hover:bg-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            
            {data.status === 'analyzed' && (
                 <div className="flex border-b border-white/5 bg-slate-900/20">
                    <TabButton active={activeTab === 'rewrite'} onClick={() => setActiveTab('rewrite')}>
                        <span className="flex items-center justify-center gap-2"><SparkIcon /> AI Rewrite</span>
                    </TabButton>
                    <TabButton active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')}>Deep Audit</TabButton>
                </div>
            )}
            
            <div className="overflow-y-auto flex-grow p-4 lg:p-6 space-y-6 z-10 custom-scrollbar pb-24 lg:pb-6">
                 {/* ... Loading States ... */}
                 {(data.status === 'discovered' || data.status === 'scanned') && (
                    <div className="text-center p-8 flex flex-col items-center justify-center h-full opacity-60">
                        <div className="animate-pulse bg-slate-700 h-12 w-12 rounded-full mb-4"></div>
                        <p className="text-slate-300 mb-2 font-medium">Ready for Analysis</p>
                    </div>
                )}
                
                {data.status === 'analyzing' && (
                    <div className="flex flex-col justify-center items-center h-full space-y-4">
                        <Spinner />
                        <p className="text-indigo-300 animate-pulse text-xs font-bold uppercase tracking-widest">Generating Insights...</p>
                    </div>
                )}

                {(data.status === 'analyzed' || data.status === 'synced' || data.status === 'updating') && activeTab === 'analysis' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-3">
                            <InfoCard title="Priority" value={data.priorityScore} />
                            <InfoCard title="Snippet Chance" value={`${data.featuredSnippetPotential?.score || 0}%`} />
                        </div>
                        
                        <InfoCard title="Search Intent" value={data.searchIntent?.toUpperCase() || 'UNKNOWN'} />
                        
                        <InfoCard title="Title Analysis" grade={data.titleGrade}>
                            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{data.titleFeedback}</p>
                        </InfoCard>
                        
                        <InfoCard title="Description Analysis" grade={data.descriptionGrade}>
                            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{data.descriptionFeedback}</p>
                        </InfoCard>

                        {data.aeoOptimization?.paaQuestions && (
                            <InfoCard title="AEO (Voice/AI)">
                                <ul className="space-y-2 mt-2">
                                    {data.aeoOptimization.paaQuestions.map((q, i) => (
                                        <li key={i} className="text-[10px] text-indigo-200 bg-indigo-500/10 p-2 rounded border border-indigo-500/20 flex gap-2">
                                            <span className="text-indigo-400 font-bold">Q:</span> {q}
                                        </li>
                                    ))}
                                </ul>
                            </InfoCard>
                        )}
                    </div>
                )}

                {(data.status === 'analyzed' || data.status === 'synced' || data.status === 'updating') && activeTab === 'rewrite' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="space-y-4">
                        {(data.suggestions || []).map((suggestion, index) => (
                             <div 
                                key={index} 
                                onClick={() => setSelectedSuggestion(suggestion)} 
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border relative overflow-hidden ${selectedSuggestion === suggestion ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'}`}
                             >
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${selectedSuggestion === suggestion ? 'text-indigo-300' : 'text-slate-500'}`}>Suggestion {index+1}</h4>
                                    {selectedSuggestion === suggestion && <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,1)]"></div>}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Title</p>
                                        <p className="text-sm font-semibold text-white leading-snug">{suggestion.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Description</p>
                                        <p className="text-xs text-slate-300 leading-relaxed">{suggestion.description}</p>
                                    </div>
                                </div>
                                {suggestion.expectedCtrLift && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/20 shadow-sm">🚀 {suggestion.expectedCtrLift} CTR</span>
                                    </div>
                                )}
                             </div>
                        ))}
                        </div>
                        
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Live Preview</h4>
                             <SerpPreview url={data.url} title={selectedSuggestion?.title ?? data.title} description={selectedSuggestion?.description ?? data.description} />
                        </div>
                    </div>
                )}
            </div>

            {(data.status === 'analyzed' || (data.status === 'updating' && updateError)) && (
                 <div className="p-4 border-t border-white/10 bg-slate-900/90 z-20 backdrop-blur-lg absolute bottom-0 left-0 right-0 lg:static">
                    {updateError && <div className="text-center mb-3 text-rose-300 text-xs bg-rose-900/20 border border-rose-500/20 p-2 rounded">{updateError}</div>}
                    <button 
                        onClick={handleUpdateClick} 
                        disabled={isUpdating || !selectedSuggestion}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isUpdating ? <Spinner /> : 'Sync to WordPress'}
                    </button>
                </div>
            )}
        </div>
    );
};
