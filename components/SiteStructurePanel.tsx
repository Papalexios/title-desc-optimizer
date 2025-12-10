import React from 'react';
import { SeoAnalysis, TopicCluster } from '../types';
import { Spinner } from './common/Spinner';

interface SiteStructurePanelProps {
    clusters: TopicCluster[];
    activeCluster: string;
    onSelectCluster: (topic: string) => void;
}

const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;

export const SiteStructurePanel: React.FC<SiteStructurePanelProps> = ({
    clusters, activeCluster, onSelectCluster
}) => {
    const totalPageCount = clusters.reduce((sum, cluster) => sum + cluster.pageCount, 0);

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 h-full flex flex-col">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Site Structure</h3>
                <p className="text-xs text-slate-400">Filter pages by AI-detected topic.</p>
            </div>
            
            <div className="overflow-y-auto flex-grow">
                 <div
                    onClick={() => onSelectCluster('All Pages')}
                    className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${activeCluster === 'All Pages' ? 'bg-indigo-900/40' : 'hover:bg-slate-800'}`}
                >
                    <FolderIcon />
                    <div className="flex-grow">
                        <p className="font-semibold text-slate-200">All Pages</p>
                        <p className="text-xs text-slate-400">{totalPageCount} pages</p>
                    </div>
                </div>

                {clusters.map(cluster => (
                    <div
                        key={cluster.topic}
                        onClick={() => onSelectCluster(cluster.topic)}
                        className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${activeCluster === cluster.topic ? 'bg-indigo-900/40' : 'hover:bg-slate-800'}`}
                    >
                         <FolderIcon />
                        <div className="flex-grow min-w-0">
                            <p className="font-semibold text-slate-200 truncate">{cluster.topic}</p>
                            <p className="text-xs text-slate-400">{cluster.pageCount} pages</p>
                        </div>
                    </div>
                ))}
                 {clusters.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-sm">
                        Topic clusters will appear here after the audit is complete.
                    </div>
                 )}
            </div>
        </div>
    );
};
