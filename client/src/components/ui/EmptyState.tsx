import React from 'react';

const EmptyState: React.FC<{ message?: string; icon?: React.ReactNode }> = ({
    message = 'No data found',
    icon,
}) => (
    <div className="flex flex-col items-center justify-center py-16 text-surface-400">
        {icon && <div className="mb-3 text-surface-300">{icon}</div>}
        <p className="text-sm">{message}</p>
    </div>
);

export default EmptyState;
