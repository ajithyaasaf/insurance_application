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
    HiOutlineOfficeBuilding,
    HiOutlineCake,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';

interface DashboardData {
    stats: {
        totalCustomers: number;
        totalActivePolicies: number;
        totalLeads: number;
        expiringPoliciesCount: number;
        todayFollowUpsCount: number;
        pendingPaymentsCount: number;
        overduePaymentsCount: number;
        todayBirthdaysCount?: number;
    };
    expiringPolicies: any[];
    todayFollowUps: any[];
    pendingPayments: any[];
    overduePayments: any[];
    recentClaims: any[];
    companyStats: any[];
    todayBirthdays?: any[];
}

const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const handleWhatsAppWish = (customer: any) => {
        const phone = customer.phone?.replace(/\D/g, '');
        if (!phone) return;
        const message = encodeURIComponent(`Hi ${customer.name}, Happy Birthday! Wishing you a wonderful day ahead. Warm regards, InsureCRM Team.`);
        window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
    };

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
        { label: 'Total Leads', value: data.stats.totalLeads, icon: HiOutlineTrendingUp, color: 'text-violet-600 bg-violet-50' },
        { label: 'Expiring (30d)', value: data.stats.expiringPoliciesCount, icon: HiOutlineClock, color: 'text-amber-600 bg-amber-50' },
        { label: "Today's Follow-ups", value: data.stats.todayFollowUpsCount, icon: HiOutlinePhone, color: 'text-cyan-600 bg-cyan-50' },
        { label: 'Pending Payments', value: data.stats.pendingPaymentsCount, icon: HiOutlineCreditCard, color: 'text-orange-600 bg-orange-50' },
        { label: 'Overdue Payments', value: data.stats.overduePaymentsCount, icon: HiOutlineExclamation, color: 'text-red-600 bg-red-50' },
        { label: "Today's Birthdays", value: data.stats.todayBirthdaysCount || 0, icon: HiOutlineCake, color: 'text-pink-600 bg-pink-50' },
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

            {/* Company-wise Stats */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
                    <HiOutlineOfficeBuilding className="w-5 h-5 text-surface-400" />
                    <h2 className="font-semibold text-surface-900">Policies by Company</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-100">
                    {data.companyStats.length === 0 ? (
                        <p className="col-span-full py-8 text-center text-sm text-surface-400">No company data available</p>
                    ) : (
                        data.companyStats.map((stat: any) => (
                            <div key={stat.companyId} className="px-5 py-4 hover:bg-surface-50 transition-colors">
                                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1 truncate">{stat.companyName}</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-xl font-bold text-surface-900">{stat.count} <span className="text-xs font-normal text-surface-500">Policies</span></p>
                                    <p className="text-sm font-semibold text-primary-600">{formatCurrency(stat.totalPremium)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
                        {data.expiringPolicies.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No expiring policies</p>
                        ) : (
                            data.expiringPolicies.map((policy: any) => (
                                <div key={policy.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 cursor-pointer" onClick={() => navigate(`/policies`)}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{policy.customer?.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs text-surface-500 truncate">{policy.productName || policy.policyType} • {policy.company?.name}</p>
                                            {policy.vehicleNumber && (
                                                <span className="px-1.5 py-0.5 rounded flex-shrink-0 bg-surface-100 text-surface-600 text-[10px] font-semibold tracking-wider uppercase border border-surface-200">
                                                    {policy.vehicleNumber}
                                                </span>
                                            )}
                                        </div>
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

                <div className="card">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900">Today's Follow-ups</h2>
                        <button onClick={() => navigate('/follow-ups')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
                        {data.todayFollowUps.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No follow-ups today</p>
                        ) : (
                                data.todayFollowUps.map((item: any) => (
                                <div key={item.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 cursor-pointer" onClick={() => navigate(item.type === 'lead' ? '/leads' : '/follow-ups')}>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-surface-900 truncate">{item.customer?.name}</p>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${item.type === 'lead' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {item.type === 'lead' ? 'Lead' : 'Customer'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-surface-500 truncate">{item.notes || 'No notes'}</p>
                                    </div>
                                    <span className={getStatusColor(item.status)}>{item.status}</span>
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
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
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
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
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

                {/* Today's Birthdays */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <div className="flex items-center gap-2">
                            <HiOutlineCake className="w-5 h-5 text-pink-500" />
                            <h2 className="font-semibold text-surface-900">Today's Birthdays</h2>
                        </div>
                    </div>
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
                        {!data.todayBirthdays || data.todayBirthdays.length === 0 ? (
                            <div className="px-5 py-8 text-center">
                                <p className="text-sm text-surface-400">No birthdays today</p>
                            </div>
                        ) : (
                            data.todayBirthdays.map((customer: any) => (
                                <div key={customer.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{customer.name}</p>
                                        <p className="text-xs text-surface-500">
                                            {customer.phone || 'No phone number'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleWhatsAppWish(customer)}
                                        disabled={!customer.phone}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaWhatsapp className="w-3.5 h-3.5" />
                                        Wish on WhatsApp
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Claims */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900">Recent Claims</h2>
                        <button onClick={() => navigate('/claims')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
                        {data.recentClaims.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400">No recent claims</p>
                        ) : (
                            data.recentClaims.map((claim: any) => (
                                <div key={claim.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 cursor-pointer" onClick={() => navigate('/claims')}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-surface-900 truncate">{claim.customer?.name}</p>
                                        <p className="text-xs text-surface-500 truncate">{claim.policyNumber} • {formatDate(claim.claimDate)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm font-semibold text-surface-900">{formatCurrency(claim.claimAmount)}</p>
                                        <span className={getStatusColor(claim.status)}>{claim.status}</span>
                                    </div>
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
