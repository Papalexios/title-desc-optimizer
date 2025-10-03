import React from 'react';
import { GradeFilter } from '../types';

interface SeoDataTableControlsProps {
    filter: GradeFilter;
    onFilterChange: (filter: GradeFilter) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

const FilterButton: React.FC<{
    label: string;
    value: GradeFilter;
    currentFilter: GradeFilter;
    onClick: (filter: GradeFilter) => void;
    colorClasses: string;
}> = ({ label, value, currentFilter, onClick, colorClasses }) => {
    const isActive = currentFilter === value;
    return (
        <button
            onClick={() => onClick(value)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                isActive
                    ? `${colorClasses}`
                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
            }`}
        >
            {label}
        </button>
    );
};

export const SeoDataTableControls: React.FC<SeoDataTableControlsProps> = ({
    filter,
    onFilterChange,
    searchTerm,
    onSearchChange,
}) => {
    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
                <FilterButton label="All" value="all" currentFilter={filter} onClick={onFilterChange} colorClasses="bg-indigo-600 text-white" />
                <FilterButton label="Good" value="good" currentFilter={filter} onClick={onFilterChange} colorClasses="bg-green-600 text-white" />
                <FilterButton label="Average" value="average" currentFilter={filter} onClick={onFilterChange} colorClasses="bg-yellow-600 text-white" />
                <FilterButton label="Poor" value="poor" currentFilter={filter} onClick={onFilterChange} colorClasses="bg-red-600 text-white" />
            </div>
            <div className="relative w-full md:w-auto">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search by URL..."
                    className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                />
            </div>
        </div>
    );
};