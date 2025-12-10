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
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 p-4 shadow-2xl z-40">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-lg font-semibold text-white">{selectedCount} page(s) selected</p>
                    <p className="text-xs text-slate-400">Choose a bulk action to perform on your selection.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBulkAnalyze}
                        disabled={isBusy || selectableForAnalysisCount === 0}
                        title={selectableForAnalysisCount > 0 ? `Analyze ${selectableForAnalysisCount} new page(s)` : 'Select pages with status "Scanned" or "Error" to analyze'}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
                    >
                        Analyze Selected ({selectableForAnalysisCount})
                    </button>
                    <button
                        onClick={onBulkRewrite}
                        disabled={isBusy || selectableForRewriteCount === 0}
                        title={selectableForRewriteCount > 0 ? `Regenerate suggestions for ${selectableForRewriteCount} page(s)` : 'Select "Analyzed" pages to regenerate suggestions'}
                        className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
                    >
                        Regenerate ({selectableForRewriteCount})
                    </button>
                    <button
                        onClick={onBulkUpdate}
                        disabled={isBusy || selectableForUpdateCount === 0}
                        title={selectableForUpdateCount > 0 ? `Auto-update ${selectableForUpdateCount} page(s) on WordPress` : 'Select "Analyzed" pages to update'}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
                    >
                        Auto-Update WP ({selectableForUpdateCount})
                    </button>
                </div>
            </div>
        </div>
    );
};
