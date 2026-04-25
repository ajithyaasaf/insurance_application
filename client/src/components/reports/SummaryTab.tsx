import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { formatCurrency, formatShortCurrency } from '../../utils/format';
import ReportTable from './ReportTable';

const SummaryTab: React.FC = () => {
    // --- Dashboard analytics ---
    const { data: dashboardData, isLoading: dashLoading } = useQuery({
        queryKey: ['report-dashboard', '', ''],
        queryFn: () => api.get('/reports/dashboard').then(r => r.data),
    });
    const dash = dashboardData?.data;

    const summaryStats = useMemo(() => {
        if (!dash) return null;
        const companyData = dash.companyPerformance?.data || [];
        const dealerData = dash.dealerPerformance?.data || [];
        const totalPremium = companyData.reduce((s: number, c: any) => s + (c.premiumSum || 0), 0);
        const totalPolicies = companyData.reduce((s: number, c: any) => s + (c.count || 0), 0);
        return { companyData, dealerData, totalPremium, totalPolicies, topCompany: companyData[0], topDealer: dealerData[0] };
    }, [dash]);

    if (dashLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
            </div>
        );
    }
    if (!summaryStats || !dash) return null;
    const { companyData, dealerData, totalPremium, totalPolicies, topCompany, topDealer } = summaryStats;

    return (
        <div className="space-y-6">
            {/* Big KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="hero-stat-card">
                    <p className="hero-stat-label">Total Policies</p>
                    <p className="hero-stat-value">{totalPolicies}</p>
                </div>
                <div className="hero-stat-card">
                    <p className="hero-stat-label truncate w-full">Total Premium</p>
                    <p className="hero-stat-value text-primary-600" title={formatCurrency(totalPremium)}>{formatShortCurrency(totalPremium)}</p>
                </div>
                <div className="hero-stat-card">
                    <p className="hero-stat-label">Renewal Rate</p>
                    <p className="hero-stat-value !text-emerald-600">
                        {dash.renewalStats?.successRate || 0}%
                    </p>
                </div>
                <div className="hero-stat-card">
                    <p className="hero-stat-label truncate w-full">Top Company</p>
                    <p className="hero-stat-subvalue">{topCompany?.name || '—'}</p>
                    <p className="hero-stat-caption" title={formatCurrency(topCompany?.premiumSum || 0)}>{formatShortCurrency(topCompany?.premiumSum || 0)}</p>
                </div>
                <div className="hero-stat-card">
                    <p className="hero-stat-label truncate w-full">Top Dealer</p>
                    <p className="hero-stat-subvalue">{topDealer?.name || '—'}</p>
                    <p className="hero-stat-caption" title={formatCurrency(topDealer?.premiumSum || 0)}>{formatShortCurrency(topDealer?.premiumSum || 0)}</p>
                </div>
                <div className="hero-stat-card">
                    <p className="hero-stat-label truncate w-full">This Month</p>
                    <p className="hero-stat-subvalue">
                        {dash.thisMonth?.policiesAdded || 0} policies
                    </p>
                    <p className="hero-stat-caption" title={formatCurrency(dash.thisMonth?.totalPremium || 0)}>
                        {formatShortCurrency(dash.thisMonth?.totalPremium || 0)}
                    </p>
                </div>
            </div>

            {/* Company-wise detail table */}
            {companyData.length > 0 && (
                <div className="card card-body">
                    <h3 className="text-sm font-bold text-surface-900 mb-4">All Companies Performance</h3>
                    <ReportTable 
                        data={companyData} 
                        columns={(dash.companyPerformance?.columns || [])
                            .filter((c: any) => c.key !== 'premiumSum')
                            .map((c: any) => c.key === 'totalPremiumSum' ? { ...c, label: 'Premium (₹)' } : c)
                        } 
                    />
                </div>
            )}

            {/* Dealer detail table */}
            {dealerData.length > 0 && (
                <div className="card card-body">
                    <h3 className="text-sm font-bold text-surface-900 mb-4">All Dealers Performance</h3>
                    <ReportTable 
                        data={dealerData} 
                        columns={(dash.dealerPerformance?.columns || [])
                            .filter((c: any) => c.key !== 'premiumSum')
                            .map((c: any) => c.key === 'totalPremiumSum' ? { ...c, label: 'Premium (₹)' } : c)
                        } 
                    />
                </div>
            )}
        </div>
    );
};

export default SummaryTab;
