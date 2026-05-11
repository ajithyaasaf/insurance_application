import React from 'react';
import Skeleton from './Skeleton';

interface TableSkeletonProps {
    rows?: number;
    cols?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 10, cols = 5 }) => {
    return (
        <div className="table-container animate-fade-in">
            <table className="table">
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i}>
                                <Skeleton width="60%" height="1.25rem" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: cols }).map((_, colIndex) => (
                                <td key={colIndex}>
                                    <div className="flex flex-col gap-2">
                                        <Skeleton width="85%" height="1rem" />
                                        {colIndex === 0 && <Skeleton width="50%" height="0.75rem" className="opacity-60" />}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TableSkeleton;
