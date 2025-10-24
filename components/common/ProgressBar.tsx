import React from 'react';

interface ProgressBarProps {
    progress: number; // 0 to 100
    label: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-slate-300">{label}</p>
                <p className="text-sm font-mono text-indigo-300">{Math.round(progress)}%</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out progress-bar-animated"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};