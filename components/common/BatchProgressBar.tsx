import React from 'react';

interface BatchProgressBarProps {
    current: number;
    total: number;
}

export const BatchProgressBar: React.FC<BatchProgressBarProps> = ({ current, total }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/80 backdrop-blur-sm p-3 shadow-2xl border-t border-slate-700">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-white">Batch Rewriting in Progress...</p>
                    <p className="text-sm font-mono text-slate-300">{current} / {total}</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
