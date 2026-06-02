import React, { useEffect, useState } from 'react';
import api from '../api/client';
import DashboardSkeleton from '../components/ui/DashboardSkeleton';
import { formatCurrency, formatDate, formatRelativeDate, getStatusColor, daysUntil, formatVehicleClass } from '../utils/format';
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
    vehicleClassStats: any[];
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

    if (loading) return <DashboardSkeleton />;

    if (!data) return <div className="text-center text-surface-500 py-20">Failed to load dashboard</div>;

    const statCards = [
        {
            label: 'Total Customers',
            value: data.stats.totalCustomers,
            icon: HiOutlineUsers,
            iconBg: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100',
            cardBg: 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/10 to-white hover:shadow-md hover:border-l-blue-600',
            valueColor: 'text-blue-600'
        },
        {
            label: 'Active Policies',
            value: data.stats.totalActivePolicies,
            icon: HiOutlineDocumentText,
            iconBg: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100',
            cardBg: 'border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50/10 to-white hover:shadow-md hover:border-l-emerald-600',
            valueColor: 'text-emerald-600'
        },
        {
            label: 'Total Leads',
            value: data.stats.totalLeads,
            icon: HiOutlineTrendingUp,
            iconBg: 'text-violet-600 bg-violet-50 group-hover:bg-violet-100',
            cardBg: 'border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50/10 to-white hover:shadow-md hover:border-l-violet-600',
            valueColor: 'text-violet-600'
        },
        {
            label: 'Expiring in 30d',
            value: data.stats.expiringPoliciesCount,
            icon: HiOutlineClock,
            iconBg: 'text-amber-600 bg-amber-50 group-hover:bg-amber-100',
            cardBg: 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/10 to-white hover:shadow-md hover:border-l-amber-600',
            valueColor: 'text-amber-600'
        },
        {
            label: 'Follow-ups (Due/Overdue)',
            value: data.stats.todayFollowUpsCount,
            icon: HiOutlinePhone,
            iconBg: 'text-cyan-600 bg-cyan-50 group-hover:bg-cyan-100',
            cardBg: 'border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50/10 to-white hover:shadow-md hover:border-l-cyan-600',
            valueColor: 'text-cyan-600'
        },
        {
            label: 'Pending Payments',
            value: data.stats.pendingPaymentsCount,
            icon: HiOutlineCreditCard,
            iconBg: 'text-orange-600 bg-orange-50 group-hover:bg-orange-100',
            cardBg: 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50/10 to-white hover:shadow-md hover:border-l-orange-600',
            valueColor: 'text-orange-600'
        },
        {
            label: 'Overdue Payments',
            value: data.stats.overduePaymentsCount,
            icon: HiOutlineExclamation,
            iconBg: 'text-red-600 bg-red-50 group-hover:bg-red-100',
            cardBg: 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/10 to-white hover:shadow-md hover:border-l-red-600',
            valueColor: 'text-red-600'
        },
        {
            label: "Today's Birthdays",
            value: data.stats.todayBirthdaysCount || 0,
            icon: HiOutlineCake,
            iconBg: 'text-pink-600 bg-pink-50 group-hover:bg-pink-100',
            cardBg: 'border-l-4 border-l-pink-500 bg-gradient-to-r from-pink-50/10 to-white hover:shadow-md hover:border-l-pink-600',
            valueColor: 'text-pink-600'
        },
    ];

    const getFollowUpUrgency = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        const compareDate = new Date(date);
        compareDate.setHours(0,0,0,0);
        
        if (compareDate.getTime() < today.getTime()) {
            return { label: 'Overdue', color: 'bg-red-50 text-red-600 border-red-200' };
        } else if (compareDate.getTime() === today.getTime()) {
            return { label: 'Today', color: 'bg-blue-50 text-blue-600 border-blue-200' };
        } else if (compareDate.getTime() === tomorrow.getTime()) {
            return { label: 'Tomorrow', color: 'bg-amber-50 text-amber-600 border-amber-200' };
        } else {
            return { label: formatDate(dateStr), color: 'bg-slate-50 text-slate-600 border-slate-200' };
        }
    };

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
                    <div key={stat.label} className={`card card-body group hover:scale-[1.02] transition-all duration-200 ${stat.cardBg}`}>
                        <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3 transition-colors`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                        <p className="stat-label text-xs">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Priority Section: Follow-up, Pending Payments & Overdue Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Follow-up (7 Days) */}
                <div className="card">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                        <h2 className="font-semibold text-surface-900">Follow-up (7 Days)</h2>
                        <button onClick={() => navigate('/follow-ups')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                            View All <HiOutlineChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-surface-100 max-h-[400px] overflow-y-auto">
                        {data.todayFollowUps.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-surface-400 font-medium">All caught up! No overdue or upcoming follow-ups for this week. 🎉</p>
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
                                        <p className="text-xs text-surface-500 truncate mt-0.5">{item.notes || 'No notes'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4">
                                        {item.nextFollowUpDate && (() => {
                                            const urgency = getFollowUpUrgency(item.nextFollowUpDate);
                                            return (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${urgency.color}`}>
                                                    {urgency.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
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

            {/* Vehicle Class Distribution */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
                    <HiOutlineDocumentText className="w-5 h-5 text-surface-400" />
                    <h2 className="font-semibold text-surface-900">Vehicle Class Distribution</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-100">
                    {data.vehicleClassStats.length === 0 ? (
                        <p className="col-span-full py-8 text-center text-sm text-surface-400">No vehicle class data available</p>
                    ) : (
                        data.vehicleClassStats.map((stat: any) => (
                            <div key={stat.vehicleClass} className="px-5 py-4 hover:bg-surface-50 transition-colors">
                                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1 truncate">{formatVehicleClass(stat.vehicleClass)}</p>
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
                <div className="card lg:col-span-2">
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
                                            {policy.vehicleClass && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-100 text-surface-700 border border-surface-200 uppercase">
                                                    {formatVehicleClass(policy.vehicleClass)}
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
                                        <p className="text-sm font-semibold text-surface-900">{claim.claimAmount != null ? formatCurrency(claim.claimAmount) : '—'}</p>
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
