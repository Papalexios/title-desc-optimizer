
import React from 'react';

interface GradeBadgeProps {
    grade: number;
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({ grade }) => {
    const getGradeColor = () => {
        if (grade >= 85) return 'bg-green-500/20 text-green-300 border-green-500/30';
        if (grade >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        return 'bg-red-500/20 text-red-300 border-red-500/30';
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor()}`}>
            {grade}
        </span>
    );
};
