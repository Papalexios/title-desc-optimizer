
import React from 'react';
import { SeoAnalysis, TopicCluster } from '../types';

interface SiteStructurePanelProps {
    clusters: TopicCluster[];
    activeCluster: string;
    onSelectCluster: (topic: string) => void;
}

const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;

export const SiteStructurePanel: React.FC<SiteStructurePanelProps> = ({
    clusters, activeCluster, onSelectCluster
}) => {
    const totalPageCount = clusters.reduce((sum, cluster) => sum + cluster.pageCount, 0);

    return (
        <div className="glass-panel rounded-2xl h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-slate-900/30">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Semantic Graph</h3>
                <p className="text-[10px] text-slate-400 mt-1">AI-Detected Topic Clusters</p>
            </div>
            
            <div className="overflow-y-auto flex-grow p-2 space-y-1">
                 <div
                    onClick={() => onSelectCluster('All Pages')}
                    className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${activeCluster === 'All Pages' ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                >
                    <FolderIcon />
                    <div className="flex-grow">
                        <p className="font-semibold text-sm">All Pages</p>
                    </div>
                    <span className="text-[10px] font-mono opacity-60 bg-black/20 px-1.5 py-0.5 rounded">{totalPageCount}</span>
                </div>

                {clusters.map(cluster => (
                    <div
                        key={cluster.topic}
                        onClick={() => onSelectCluster(cluster.topic)}
                         className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${activeCluster === cluster.topic ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                         <FolderIcon />
                        <div className="flex-grow min-w-0">
                            <p className="font-semibold text-sm truncate pr-2">{cluster.topic}</p>
                        </div>
                        <span className="text-[10px] font-mono opacity-60 bg-black/20 px-1.5 py-0.5 rounded">{cluster.pageCount}</span>
                    </div>
                ))}
                 {clusters.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs italic">
                        Clusters will form here.
                    </div>
                 )}
            </div>
        </div>
    );
};
