import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SeoAnalysis } from '../types';
import { GradeBadge } from './common/GradeBadge';
import { Spinner } from './common/Spinner';

type SortKey = 'priority' | 'grade' | 'url';
type SortDirection = 'asc' | 'desc';

const StatusBadge: React.FC<{ status: SeoAnalysis['status'] }> = ({ status }) => {
    switch (status) {
        case 'analyzing':
            return <span className="flex items-center text-xs font-medium text-sky-300"><Spinner /> Analyzing...</span>;
        case 'analyzed':
             return <span className="flex items-center text-xs font-medium text-indigo-300">Analyzed</span>;
        case 'synced':
            return <span className="flex items-center text-xs font-medium text-green-400">Synced to WP</span>;
        case 'updating':
            return <span className="flex items-center text-xs font-medium text-yellow-300"><Spinner /> Updating...</span>;
        case 'error':
            return <span className="flex items-center text-xs font-medium text-red-400">Error</span>;
        case 'scanned':
             return <span className="text-xs font-medium text-slate-400">Ready to Analyze</span>;
        case 'discovered':
             return <span className="text-xs font-medium text-slate-500">Discovered</span>;
        default:
            return <span className="text-xs font-medium text-slate-500">{status}</span>;
    }
};

const PriorityIndicator: React.FC<{ score: number }> = ({ score }) => {
    const getColor = () => {
        if (score > 80) return 'text-red-400';
        if (score > 60) return 'text-orange-400';
        if (score > 40) return 'text-yellow-400';
        return 'text-slate-500';
    };
    return (
        <div className="flex items-center gap-1.5" title={`Priority Score: ${score}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${getColor()}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l-6.794 12.43a1 1 0 00.385 1.451 1 1 0 001.45-.385S11.498 9.502 11.498 9.5c0-.002 0-.004 0-.006l.003-.005c.21-.375.478-.697.822-.934a1 1 0 00.385-1.45z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-sm">{score}</span>
        </div>
    );
};

const SortableHeader: React.FC<{ label: string; sortKey: SortKey; currentSort: { key: SortKey; dir: SortDirection }; onSort: (key: SortKey) => void; className?: string }> = 
({ label, sortKey, currentSort, onSort, className }) => {
    const isCurrent = currentSort.key === sortKey;
    const icon = isCurrent ? (currentSort.dir === 'asc' ? '▲' : '▼') : '';
    return (
        <div className={`cursor-pointer ${className}`} onClick={() => onSort(sortKey)}>
            {label} <span className="text-indigo-400">{icon}</span>
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
    
    // --- SOTA: VIRTUALIZATION ENGINE ---
    const parentRef = useRef<HTMLDivElement>(null);
    const [visibleHeight, setVisibleHeight] = useState(600);
    const [scrollTop, setScrollTop] = useState(0);
    const ROW_HEIGHT = 88; // Fixed height for speed

    useEffect(() => {
        if (parentRef.current) {
            const resizeObserver = new ResizeObserver(() => {
                if (parentRef.current) setVisibleHeight(parentRef.current.clientHeight);
            });
            resizeObserver.observe(parentRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);
    
    const handleSort = (key: SortKey) => {
        setSort(prev => {
            if (prev.key === key) {
                return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { key, dir: 'desc' };
        });
    };

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
            <div className="text-center bg-slate-800/50 border border-slate-700 rounded-lg p-12 h-full flex flex-col justify-center">
                <h3 className="text-xl font-semibold text-slate-300">No Pages Found</h3>
                <p className="text-slate-400 mt-2">The pages for the selected topic cluster will appear here.</p>
            </div>
        );
    }
    
    // Virtualization Calculations
    const totalHeight = sortedData.length * ROW_HEIGHT;
    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const endIndex = Math.min(
        sortedData.length - 1,
        Math.floor((scrollTop + visibleHeight) / ROW_HEIGHT) + 5 // +5 Buffer
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
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 h-full flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="p-4 border-b border-slate-700 hidden lg:block bg-slate-800 z-10 shrink-0">
                 <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider items-center">
                    <div className="col-span-6 flex items-center gap-3">
                        {onSelectAll && (
                            <input 
                                type="checkbox" 
                                checked={allSelected} 
                                onChange={onSelectAll}
                                className="h-4 w-4 rounded bg-slate-900 border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        )}
                        <SortableHeader label="URL" sortKey="url" currentSort={sort} onSort={handleSort} />
                    </div>
                    <SortableHeader label="Priority" sortKey="priority" currentSort={sort} onSort={handleSort} className="col-span-2 text-center" />
                    <SortableHeader label="Grade" sortKey="grade" currentSort={sort} onSort={handleSort} className="col-span-1 text-center" />
                    <div className="col-span-3">Status</div>
                </div>
            </div>
            
            {/* Virtual Scroll Container */}
            <div 
                className="overflow-y-auto flex-grow relative custom-scrollbar"
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
                                className={`grid grid-cols-12 gap-4 items-center p-4 border-b border-slate-700/50 transition-colors duration-200 ${isActive ? 'bg-indigo-900/40 border-l-2 border-l-indigo-500' : 'hover:bg-slate-800'}`}
                            >
                                <div className="col-span-12 lg:col-span-6 min-w-0 flex items-center gap-3">
                                    {onToggleSelection && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected} 
                                                onChange={() => onToggleSelection(item.url)}
                                                className="h-4 w-4 rounded bg-slate-900 border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    <div className="min-w-0 cursor-pointer flex-grow" onClick={() => onRowClick(item.url)}>
                                        <p className="text-sm font-medium text-indigo-300 truncate" title={item.url}>{item.url}</p>
                                        <p className="text-xs text-slate-400 truncate mt-1" title={item.title}>{item.title || '(No title found)'}</p>
                                    </div>
                                </div>
                                <div className="col-span-4 lg:col-span-2 flex justify-center cursor-pointer" onClick={() => onRowClick(item.url)}>
                                    {item.priorityScore !== undefined ? <PriorityIndicator score={item.priorityScore} /> : <span className="text-slate-500 text-xs">-</span>}
                                </div>
                                <div className="col-span-4 lg:col-span-1 flex justify-center cursor-pointer" onClick={() => onRowClick(item.url)}>
                                    {item.grade !== undefined ? <GradeBadge grade={item.grade} /> : <span className="text-slate-500 text-xs">-</span>}
                                </div>
                                <div className="col-span-4 lg:col-span-3 cursor-pointer" onClick={() => onRowClick(item.url)}>
                                    <StatusBadge status={item.status} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};