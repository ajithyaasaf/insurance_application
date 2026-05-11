import React from 'react';
import Skeleton from './Skeleton';

const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card card-body">
                        <Skeleton width="40%" height="0.75rem" className="mb-2 opacity-60" />
                        <Skeleton width="70%" height="2rem" className="mb-4" />
                        <Skeleton width="100%" height="0.5rem" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Section */}
                <div className="lg:col-span-2 card card-body h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <Skeleton width="150px" height="1.25rem" />
                        <Skeleton width="100px" height="2rem" />
                    </div>
                    <Skeleton width="100%" height="300px" />
                </div>

                {/* Sidebar Recent Activity */}
                <div className="card">
                    <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                        <Skeleton width="120px" height="1.25rem" />
                        <Skeleton width="20px" height="20px" circle />
                    </div>
                    <div className="p-5 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton width="40px" height="40px" circle className="shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton width="80%" height="1rem" />
                                    <Skeleton width="40%" height="0.75rem" className="opacity-60" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardSkeleton;
