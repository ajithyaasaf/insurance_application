import React from 'react';
import { HiOutlineTable } from 'react-icons/hi';
import { formatCurrency } from '../../utils/format';

interface Column {
    key: string;
    label: string;
}

interface ReportTableProps {
    data: any[];
    columns: Column[];
    isLoading?: boolean;
}

const ReportTable: React.FC<ReportTableProps> = ({ data, columns, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-surface-400">
                <HiOutlineTable className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium">No data found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="table whitespace-nowrap">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col.key}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row: any, i: number) => (
                        <tr key={row.id || i}>
                            {columns.map(col => (
                                <td key={col.key}>
                                    {typeof row[col.key] === 'number' && col.label.includes('₹')
                                        ? formatCurrency(row[col.key])
                                        : row[col.key] ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReportTable;
