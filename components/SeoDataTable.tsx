
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SeoAnalysis } from '../types';
import { GradeBadge } from './common/GradeBadge';
import { Spinner } from './common/Spinner';

type SortKey = 'priority' | 'grade' | 'url';
type SortDirection = 'asc' | 'desc';

const StatusBadge: React.FC<{ status: SeoAnalysis['status'] }> = ({ status }) => {
    switch (status) {
        case 'analyzing':
            return <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-sky-400"><Spinner /> Analyzing</span>;
        case 'analyzed':
             return <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-indigo-400">Analyzed</span>;
        case 'synced':
            return <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-400">Synced</span>;
        case 'updating':
            return <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-400"><Spinner /> Updating</span>;
        case 'error':
            return <span className="flex items-center text-[10px] font-bold uppercase tracking-wider text-rose-500">Error</span>;
        case 'scanned':
             return <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ready</span>;
        default:
            return <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{status}</span>;
    }
};

const PriorityIndicator: React.FC<{ score: number }> = ({ score }) => {
    const getColor = () => {
        if (score > 80) return 'text-rose-400';
        if (score > 60) return 'text-amber-400';
        if (score > 40) return 'text-yellow-400';
        return 'text-slate-600';
    };
    return (
        <div className="flex items-center gap-1" title={`Priority Score: ${score}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${getColor()}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l-6.794 12.43a1 1 0 00.385 1.451 1 1 0 001.45-.385S11.498 9.502 11.498 9.5c0-.002 0-.004 0-.006l.003-.005c.21-.375.478-.697.822-.934a1 1 0 00.385-1.45z" clipRule="evenodd" />
            </svg>
            <span className="font-bold text-xs font-mono">{score}</span>
        </div>
    );
};

interface SeoDataTableProps {
    data: SeoAnalysis[];
    onRowClick: (url: string) => void;
    activeUrl: string | null;
    selectedUrls?: Set<string>;
    onToggleSelection?: (url: string) => void;
    onSelectAll?: () => void;
}

export const SeoDataTable: React.FC<SeoDataTableProps> = ({ 
    data, onRowClick, activeUrl, selectedUrls, onToggleSelection, onSelectAll 
}) => {
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDirection }>({ key: 'priority', dir: 'desc' });
    
    const parentRef = useRef<HTMLDivElement>(null);
    const [visibleHeight, setVisibleHeight] = useState(600);
    const [scrollTop, setScrollTop] = useState(0);
    const ROW_HEIGHT = 88; // Optimized for mobile touch targets

    useEffect(() => {
        if (parentRef.current) {
            const resizeObserver = new ResizeObserver(() => {
                if (parentRef.current) setVisibleHeight(parentRef.current.clientHeight);
            });
            resizeObserver.observe(parentRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const aVal = a[sort.key] ?? (sort.key === 'priority' || sort.key === 'grade' ? -1 : '');
            const bVal = b[sort.key] ?? (sort.key === 'priority' || sort.key === 'grade' ? -1 : '');
            if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sort]);

    if (data.length === 0) {
        return (
            <div className="glass-panel rounded-xl p-12 h-full flex flex-col justify-center items-center text-center">
                <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-300">No Pages Found</h3>
                <p className="text-slate-500 mt-2 text-sm">Cluster is empty.</p>
            </div>
        );
    }
    
    const totalHeight = sortedData.length * ROW_HEIGHT;
    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const endIndex = Math.min(
        sortedData.length - 1,
        Math.floor((scrollTop + visibleHeight) / ROW_HEIGHT) + 4
    );

    const virtualItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
        virtualItems.push({
            index: i,
            item: sortedData[i],
            top: i * ROW_HEIGHT
        });
    }
    
    const allSelected = selectedUrls && sortedData.length > 0 && sortedData.every(d => selectedUrls.has(d.url));

    return (
        <div className="glass-panel rounded-2xl h-full flex flex-col overflow-hidden shadow-2xl relative">
            {/* Desktop Header - Hidden on Mobile */}
            <div className="p-4 border-b border-white/5 bg-slate-900/40 hidden lg:block z-20">
                 <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest items-center">
                    <div className="col-span-6 flex items-center gap-4">
                        {onSelectAll && (
                            <input 
                                type="checkbox" 
                                checked={allSelected} 
                                onChange={onSelectAll}
                                className="h-4 w-4 rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer transition-all"
                            />
                        )}
                        <span>URL / Title</span>
                    </div>
                    <div className="col-span-2 text-center">Priority</div>
                    <div className="col-span-1 text-center">Grade</div>
                    <div className="col-span-3 text-right pr-2">Status</div>
                </div>
            </div>
            
            {/* Mobile Header - Select All */}
            <div className="lg:hidden p-3 border-b border-white/5 bg-slate-900/40 flex justify-between items-center z-20">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sortedData.length} Pages</span>
                 {onSelectAll && (
                    <button onClick={onSelectAll} className="text-xs font-semibold text-indigo-400">
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                 )}
            </div>
            
            <div 
                className="overflow-y-auto flex-grow relative"
                ref={parentRef}
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            >
                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                    {virtualItems.map(({ index, item, top }) => {
                        const isActive = activeUrl === item.url;
                        const isSelected = selectedUrls?.has(item.url);
                        
                        return (
                            <div 
                                key={item.url} 
                                style={{
                                    position: 'absolute',
                                    top: `${top}px`,
                                    left: 0,
                                    right: 0,
                                    height: `${ROW_HEIGHT}px`
                                }}
                                className={`group p-4 border-b border-white/5 transition-all duration-200 cursor-pointer ${isActive ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-white/5'}`}
                                onClick={() => onRowClick(item.url)}
                            >
                                <div className="flex items-center gap-3 h-full">
                                    {onToggleSelection && (
                                        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={() => onToggleSelection(item.url)}
                                                className="h-5 w-5 rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer transition-all"
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="flex-grow min-w-0 flex flex-col justify-center gap-1">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm font-semibold truncate pr-2 ${isActive ? 'text-indigo-300' : 'text-slate-200'}`} title={item.url}>
                                                {item.url}
                                            </p>
                                            {/* Mobile Status Indicator */}
                                            <div className="lg:hidden">
                                                 <StatusBadge status={item.status} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-500 truncate max-w-[70%]" title={item.title}>{item.title || '(No title)'}</p>
                                            
                                            {/* Mobile Priority/Grade */}
                                            <div className="flex items-center gap-3 lg:hidden">
                                                {item.priorityScore !== undefined && <PriorityIndicator score={item.priorityScore} />}
                                                {item.grade !== undefined && <GradeBadge grade={item.grade} />}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Desktop Columns */}
                                    <div className="hidden lg:flex col-span-2 justify-center w-24">
                                        {item.priorityScore !== undefined ? <PriorityIndicator score={item.priorityScore} /> : <span className="text-slate-700 text-xs">-</span>}
                                    </div>
                                    <div className="hidden lg:flex col-span-1 justify-center w-16">
                                        {item.grade !== undefined ? <GradeBadge grade={item.grade} /> : <span className="text-slate-700 text-xs">-</span>}
                                    </div>
                                    <div className="hidden lg:flex col-span-3 justify-end w-32">
                                        <StatusBadge status={item.status} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
