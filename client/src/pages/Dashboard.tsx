import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { formatCurrency, formatDate, formatRelativeDate, getStatusColor, daysUntil } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineDocumentText,
    HiOutlineUsers,
    HiOutlineTrendingUp,
    HiOutlineCreditCard,
    HiOutlineExclamation,
    HiOutlinePhone,
    HiOutlineClock,
    HiOutlineChevronRight,
} from 'react-icons/hi';

interface DashboardData {
    stats: {
        totalCustomers: number;
        totalActivePolicies: number;
        totalLeads: number;
        expiringPoliciesCount: number;
        todayFollowUpsCount: number;
        pendingPaymentsCount: number;
        overduePaymentsCount: number;
    };
    expiringPolicies: any[];
    todayFollowUps: any[];
    pendingPayments: any[];
    overduePayments: any[];
    recentClaims: any[];
}

const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/dashboard/summary');
                setData(res.data.data);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!data) return <div className="text-center text-surface-500 py-20">Failed to load dashboard</div>;

    const statCards = [
        { label: 'Total Customers', value: data.stats.totalCustomers, icon: HiOutlineUsers, color: 'text-blue-600 bg-blue-50' },
        { label: 'Active Policies', value: data.stats.totalActivePolicies, icon: HiOutlineDocumentText, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Open Leads', value: data.stats.totalLeads, icon: HiOutlineTrendingUp, color: 'text-violet-600 bg-violet-50' },
        { label: 'Expiring (30d)', value: data.stats.expiringPoliciesCount, icon: HiOutlineClock, color: 'text-amber-600 bg-amber-50' },
        { label: "Today's Follow-ups", value: data.stats.todayFollowUpsCount, icon: HiOutlinePhone, color: 'text-cyan-600 bg-cyan-50' },
        { label: 'Pending Payments', value: data.stats.pendingPaymentsCount, icon: HiOutlineCreditCard, color: 'text-orange-600 bg-orange-50' },
        { label: 'Overdue Payments', value: data.stats.overduePaymentsCount, icon: HiOutlineExclamation, color: 'text-red-600 bg-red-50' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="text-sm text-surface-500 mt-1">Your daily overview</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                {statCards.map((stat) => (
                    <div key={stat.label} className="card card-body group hover:scale-[1.02] transition-transform">
                        <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <p className="stat-value">{stat.value}</p>
                        <p className="stat-label text-xs">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expiring Policies */}
                <div className="card">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900">Expiring Policies</h2>
                        <button onClick={() => navigate('/policies')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100">
                        {data.expiringPolicies.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No expiring policies</p>
                        ) : (
                            data.expiringPolicies.map((policy: any) => (
                                <div key={policy.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 cursor-pointer" onClick={() => navigate(`/policies`)}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{policy.customer?.name}</p>
                                        <p className="text-xs text-surface-500">{policy.productName || policy.policyType} • {policy.company?.name}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className={`text-xs font-medium ${daysUntil(policy.expiryDate) <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                                            {formatRelativeDate(policy.expiryDate)}
                                        </p>
                                        <p className="text-xs text-surface-400">{formatDate(policy.expiryDate)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Today's Follow-ups */}
                <div className="card">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900">Today's Follow-ups</h2>
                        <button onClick={() => navigate('/follow-ups')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100">
                        {data.todayFollowUps.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No follow-ups today</p>
                        ) : (
                            data.todayFollowUps.map((fu: any) => (
                                <div key={fu.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{fu.customer?.name}</p>
                                        <p className="text-xs text-surface-500 truncate">{fu.notes || 'No notes'}</p>
                                    </div>
                                    <span className={getStatusColor(fu.status)}>{fu.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pending Payments */}
                <div className="card">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900">Pending Payments</h2>
                        <button onClick={() => navigate('/payments')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100">
                        {data.pendingPayments.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No pending payments</p>
                        ) : (
                            data.pendingPayments.map((payment: any) => (
                                <div key={payment.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{payment.customer?.name}</p>
                                        <p className="text-xs text-surface-500">Due: {formatDate(payment.dueDate)}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-surface-900">{formatCurrency(payment.amount)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Overdue Payments */}
                <div className="card">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900 text-red-700">Overdue Payments</h2>
                        <button onClick={() => navigate('/payments')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100">
                        {data.overduePayments.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No overdue payments 🎉</p>
                        ) : (
                            data.overduePayments.map((payment: any) => (
                                <div key={payment.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{payment.customer?.name}</p>
                                        <p className="text-xs text-red-500">Due: {formatDate(payment.dueDate)}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-red-600">{formatCurrency(payment.amount)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
