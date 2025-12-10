
import React from 'react';

interface BulkOperationsPanelProps {
    selectedCount: number;
    selectableForAnalysisCount: number;
    selectableForRewriteCount: number;
    selectableForUpdateCount: number;
    onBulkAnalyze: () => void;
    onBulkRewrite: () => void;
    onBulkUpdate: () => void;
    isBusy: boolean;
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
    selectedCount,
    selectableForAnalysisCount,
    selectableForRewriteCount,
    selectableForUpdateCount,
    onBulkAnalyze,
    onBulkRewrite,
    onBulkUpdate,
    isBusy,
}) => {
    return (
        <div className="fixed bottom-6 left-4 right-4 z-40 flex justify-center">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 max-w-2xl w-full">
                <div className="px-3 text-center sm:text-left">
                    <p className="text-sm font-bold text-white whitespace-nowrap">{selectedCount} Selected</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={onBulkAnalyze}
                        disabled={isBusy || selectableForAnalysisCount === 0}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none transition-all text-xs sm:text-sm whitespace-nowrap"
                    >
                        Analyze ({selectableForAnalysisCount})
                    </button>
                    <button
                        onClick={onBulkRewrite}
                        disabled={isBusy || selectableForRewriteCount === 0}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none transition-all text-xs sm:text-sm whitespace-nowrap"
                    >
                        Rewrite ({selectableForRewriteCount})
                    </button>
                    <button
                        onClick={onBulkUpdate}
                        disabled={isBusy || selectableForUpdateCount === 0}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none transition-all text-xs sm:text-sm whitespace-nowrap"
                    >
                        Sync ({selectableForUpdateCount})
                    </button>
                </div>
            </div>
        </div>
    );
};
