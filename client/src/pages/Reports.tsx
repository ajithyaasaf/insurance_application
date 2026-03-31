import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    HiOutlineChartBar,
    HiOutlineAdjustments,
    HiOutlineDocumentDownload,
    HiOutlineRefresh,
    HiOutlineTable,
    HiOutlineTrendingUp,
    HiOutlineOfficeBuilding,
    HiOutlineCurrencyRupee,
    HiOutlineClipboardCheck,
    HiOutlineFilter,
} from 'react-icons/hi';
import api from '../api/client';
import { formatCurrency, formatShortCurrency } from '../utils/format';
import Pagination from '../components/ui/Pagination';
import SearchableSelect from '../components/ui/SearchableSelect';
import { POLICY_TYPES, VEHICLE_CLASSES, POLICY_STATUSES, PAYMENT_STATUSES, CLAIM_STATUSES, FOLLOWUP_STATUSES } from '../utils/constants';

// ─── Types ───────────────────────────────────────────────

type Source = 'policies' | 'payments' | 'claims' | 'customers' | 'followups';
type GroupBy = 'company' | 'dealer' | 'policyType' | 'vehicleClass' | 'status' | 'month' | '';
type TabId = 'dashboard' | 'builder' | 'summary';

interface Column { key: string; label: string }
interface ReportFilters {
    companyId?: string;
    dealerId?: string;
    policyType?: string;
    vehicleClass?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}

// ─── Constants ───────────────────────────────────────────

const SOURCE_OPTIONS: { value: Source; label: string; icon: React.ElementType }[] = [
    { value: 'policies', label: 'Policies', icon: HiOutlineClipboardCheck },
    { value: 'payments', label: 'Payments', icon: HiOutlineCurrencyRupee },
    { value: 'claims', label: 'Claims', icon: HiOutlineDocumentDownload },
    { value: 'customers', label: 'Customers', icon: HiOutlineTable },
    { value: 'followups', label: 'Follow-ups', icon: HiOutlineRefresh },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: '', label: 'No Grouping' },
    { value: 'company', label: 'By Company' },
    { value: 'dealer', label: 'By Dealer' },
    { value: 'policyType', label: 'By Policy Type' },
    { value: 'vehicleClass', label: 'By Vehicle Class' },
    { value: 'status', label: 'By Status' },
    { value: 'month', label: 'By Month' },
];



const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
    { id: 'builder', label: 'Report Builder', icon: HiOutlineAdjustments },
    { id: 'summary', label: 'Quick Summary', icon: HiOutlineTrendingUp },
];

// ─── Helper: get status options per source ───────────────

function getStatusOptions(source: Source): string[] {
    switch (source) {
        case 'policies': return POLICY_STATUSES;
        case 'payments': return PAYMENT_STATUSES;
        case 'claims': return CLAIM_STATUSES;
        case 'followups': return FOLLOWUP_STATUSES;
        default: return [];
    }
}

// ─── Component ───────────────────────────────────────────

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');

    // --- Report Builder state ---
    const [source, setSource] = useState<Source>('policies');
    const [groupBy, setGroupBy] = useState<GroupBy>('');
    const [filters, setFilters] = useState<ReportFilters>({});
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [showColumns, setShowColumns] = useState(false);
    const limit = 25;

    // --- Fetch companies & dealers for dropdown ---
    const { data: companiesData } = useQuery({
        queryKey: ['companies'],
        queryFn: () => api.get('/companies').then(r => r.data),
    });
    const { data: dealersData } = useQuery({
        queryKey: ['dealers'],
        queryFn: () => api.get('/dealers').then(r => r.data),
    });
    const companies = companiesData?.data || [];
    const dealers = dealersData?.data || [];

    // --- Dashboard analytics ---
    const { data: dashboardData, isLoading: dashLoading } = useQuery({
        queryKey: ['report-dashboard'],
        queryFn: () => api.get('/reports/dashboard').then(r => r.data),
        enabled: activeTab === 'dashboard' || activeTab === 'summary',
    });
    const dash = dashboardData?.data;

    // --- Report builder data ---
    const { data: reportData, isLoading: reportLoading, refetch } = useQuery({
        queryKey: ['report-generate', source, groupBy, filters, page],
        queryFn: () => api.post('/reports/generate', {
            source,
            filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
            groupBy: groupBy || undefined,
            page,
            limit,
        }).then(r => r.data),
        enabled: activeTab === 'builder',
    });
    const report = reportData?.data;

    // --- Filter update ---
    const updateFilter = useCallback((key: keyof ReportFilters, value: string) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value || undefined };
            if (next.dateFrom && next.dateTo && new Date(next.dateFrom) > new Date(next.dateTo)) {
                toast.error('Date From cannot be after Date To');
                return prev;
            }
            return next;
        });
        setPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({});
        setGroupBy('');
        setPage(1);
        setHiddenColumns([]);
    }, []);

    // --- Export handler ---
    const handleExport = useCallback(async (format: 'xlsx' | 'pdf', cols: Column[]) => {
        try {
            toast.loading(`Generating ${format.toUpperCase()}...`, { id: 'export' });
            const res = await api.post('/reports/export', {
                source,
                filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
                groupBy: groupBy || undefined,
                format,
                columns: cols.map(c => c.key),
                title: `${source.charAt(0).toUpperCase() + source.slice(1)} Report`,
            }, { responseType: 'blob' });

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${source}_${new Date().toISOString().split('T')[0]}.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`${format.toUpperCase()} downloaded!`, { id: 'export' });
        } catch {
            toast.error('Export failed', { id: 'export' });
        }
    }, [source, filters, groupBy]);

    // ── Render helpers ───────────────────────────────────

    const renderTable = (data: any[], columns: Column[]) => {
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

    const renderBarChart = (data: any[], nameKey: string, valueKey: string, label: string) => {
        if (!data?.length) return null;
        const maxVal = Math.max(...data.map((d: any) => d[valueKey] || 0), 1);
        return (
            <div className="space-y-2.5">
                {data.slice(0, 8).map((item: any, i: number) => (
                    <div key={item[nameKey] || item.id || i} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-surface-700 font-medium truncate mr-2 capitalize">
                                {item[nameKey] || 'N/A'}
                            </span>
                            <span className="text-surface-500 font-medium whitespace-nowrap">
                                {typeof item[valueKey] === 'number' && label.includes('₹')
                                    ? formatCurrency(item[valueKey])
                                    : item[valueKey]}
                            </span>
                        </div>
                        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${Math.max((item[valueKey] / maxVal) * 100, 2)}%`,
                                    background: `linear-gradient(90deg, 
                                        hsl(${240 - i * 25}, 70%, 55%), 
                                        hsl(${240 - i * 25}, 70%, 65%))`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ── Dashboard Tab ────────────────────────────────────

    const renderDashboard = () => {
        if (dashLoading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
                </div>
            );
        }
        if (!dash) return null;

        const companyData = dash.companyPerformance?.data || [];
        const policyTypeData = dash.policyTypeBreakdown?.data || [];
        const dealerData = dash.dealerPerformance?.data || [];
        const monthlyData = dash.monthlyTrend?.data || [];
        const paymentData = dash.paymentSummary?.data || [];

        return (
            <div className="space-y-6">
                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                                <HiOutlineClipboardCheck className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="stat-label">This Month Policies</p>
                                <p className="stat-value text-xl">{dash.thisMonth?.policiesAdded || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <HiOutlineCurrencyRupee className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="stat-label truncate">This Month Premium</p>
                                <p className="stat-value text-xl" title={formatCurrency(dash.thisMonth?.totalPremium || 0)}>{formatShortCurrency(dash.thisMonth?.totalPremium || 0)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <HiOutlineRefresh className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="stat-label">Renewal Rate</p>
                                <p className="stat-value text-xl">{dash.renewalStats?.successRate || 0}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <HiOutlineOfficeBuilding className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="stat-label">Active Companies</p>
                                <p className="stat-value text-xl">{companyData.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Company Performance */}
                    <div className="card card-body">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-surface-900">Company-wise Performance</h3>
                            <span className="badge-info">{companyData.length} companies</span>
                        </div>
                        {renderBarChart(companyData, 'name', 'premiumSum', 'Premium (₹)')}
                    </div>

                    {/* Policy Type Breakdown */}
                    <div className="card card-body">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-surface-900">Policy Type Breakdown</h3>
                            <span className="badge-info">{policyTypeData.length} types</span>
                        </div>
                        {renderBarChart(policyTypeData, 'name', 'count', 'Policies')}
                        {!policyTypeData?.length && (
                            <p className="text-xs text-surface-400 text-center py-6">No policy data available</p>
                        )}
                    </div>

                    {/* Dealer Performance */}
                    <div className="card card-body">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-surface-900">Dealer Performance</h3>
                            <span className="badge-info">{dealerData.length} dealers</span>
                        </div>
                        {renderBarChart(dealerData, 'name', 'premiumSum', 'Premium (₹)')}
                        {!dealerData?.length && (
                            <p className="text-xs text-surface-400 text-center py-6">No dealer data available</p>
                        )}
                    </div>

                    {/* Monthly Trend */}
                    <div className="card card-body">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-bold text-surface-900">Monthly Premium Trend</h3>
                            <span className="badge-info">Last 12 months</span>
                        </div>
                        {renderBarChart(monthlyData, 'name', 'premiumSum', 'Premium (₹)')}
                        {!monthlyData?.length && (
                            <p className="text-xs text-surface-400 text-center py-6">No monthly data available</p>
                        )}
                    </div>
                </div>

                {/* Payment Summary */}
                {paymentData?.length > 0 && (
                    <div className="card card-body">
                        <h3 className="text-sm font-bold text-surface-900 mb-4">Payment Collection Summary</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {paymentData.map((p: any, i: number) => (
                                <div key={i} className="text-center p-3 rounded-xl bg-surface-50">
                                    <p className="text-lg font-bold text-surface-900 capitalize">{p.name}</p>
                                    <p className="text-xs text-surface-500 mt-1">{p.count} payments</p>
                                    <p className="text-sm font-semibold text-primary-600 mt-1">
                                        {formatCurrency(p.amountSum || 0)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Report Builder Tab ───────────────────────────────

    const renderBuilder = () => {
        const statuses = getStatusOptions(source);

        return (
            <div className="space-y-4">
                {/* Source selector pills */}
                <div className="card card-body">
                    <div className="flex items-center gap-2 mb-4">
                        <HiOutlineTable className="w-4 h-4 text-surface-500" />
                        <span className="text-sm font-bold text-surface-900">Data Source</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {SOURCE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { setSource(opt.value); setGroupBy(''); setFilters({}); setPage(1); setHiddenColumns([]); setShowColumns(false); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${source === opt.value
                                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                                    }`}
                            >
                                <opt.icon className="w-4 h-4" />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters + Group By */}
                <div className="card card-body">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <HiOutlineFilter className="w-4 h-4 text-surface-500" />
                            <span className="text-sm font-bold text-surface-900">Filters & Grouping</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="btn-secondary btn-sm lg:hidden"
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </button>
                            <button onClick={clearFilters} className="btn-ghost btn-sm text-red-500">
                                Clear All
                            </button>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${!showFilters ? 'hidden lg:grid' : ''}`}>
                        {/* Group By */}
                        <div>
                            <label className="label">Group By</label>
                            <SearchableSelect
                                options={GROUP_OPTIONS.filter(o => o.value !== '').map(opt => ({ value: opt.value, label: opt.label }))}
                                value={groupBy}
                                onChange={val => { setGroupBy(val as GroupBy); setPage(1); }}
                                allLabel="No Grouping"
                                placeholder="Select grouping..."
                            />
                        </div>

                        {/* Company */}
                        <div>
                            <label className="label">Company</label>
                            <SearchableSelect
                                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                                value={filters.companyId || ''}
                                onChange={val => updateFilter('companyId', val)}
                                allLabel="All Companies"
                                placeholder="Search company..."
                            />
                        </div>

                        {/* Dealer */}
                        <div>
                            <label className="label">Dealer</label>
                            <SearchableSelect
                                options={dealers.map((d: any) => ({ value: d.id, label: d.name }))}
                                value={filters.dealerId || ''}
                                onChange={val => updateFilter('dealerId', val)}
                                allLabel="All Dealers"
                                placeholder="Search dealer..."
                            />
                        </div>

                        {/* Policy Type (only for policies, claims, payments, followups) */}
                        {source !== 'customers' && (
                            <div>
                                <label className="label">Policy Type</label>
                                <SearchableSelect
                                    options={POLICY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                                    value={filters.policyType || ''}
                                    onChange={val => updateFilter('policyType', val)}
                                    allLabel="All Types"
                                    placeholder="Select policy type..."
                                />
                            </div>
                        )}

                        {/* Vehicle Class (Only for policies and motor) */}
                        {source === 'policies' && filters.policyType === 'motor' && (
                            <div>
                                <label className="label">Vehicle Class</label>
                                <SearchableSelect
                                    options={VEHICLE_CLASSES.map(t => ({ value: t, label: t.replace('_', ' ') }))}
                                    value={filters.vehicleClass || ''}
                                    onChange={val => updateFilter('vehicleClass', val)}
                                    allLabel="All Classes"
                                    placeholder="Select vehicle class..."
                                />
                            </div>
                        )}

                        {/* Status */}
                        {statuses.length > 0 && (
                            <div>
                                <label className="label">Status</label>
                                <SearchableSelect
                                    options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                                    value={filters.status || ''}
                                    onChange={val => updateFilter('status', val)}
                                    allLabel="All Statuses"
                                    placeholder="Select status..."
                                />
                            </div>
                        )}

                        {/* Date From */}
                        <div>
                            <label className="label">Date From</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.dateFrom || ''}
                                onChange={e => updateFilter('dateFrom', e.target.value)}
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="label">Date To</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.dateTo || ''}
                                onChange={e => updateFilter('dateTo', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
                    <button
                        onClick={() => refetch()}
                        className="btn-primary w-full sm:w-auto"
                            disabled={reportLoading}
                        >
                            <HiOutlineRefresh className={`w-4 h-4 ${reportLoading ? 'animate-spin' : ''}`} />
                            Generate Report
                        </button>
                    <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                        {report && !report.grouped && (
                            <button
                                onClick={() => setShowColumns(!showColumns)}
                                className="btn-secondary w-full"
                            >
                                <HiOutlineAdjustments className="w-4 h-4" />
                                <span className="hidden xs:inline sm:hidden md:inline">Cols</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleExport('xlsx', report?.columns?.filter((c: Column) => report.grouped ? true : !hiddenColumns.includes(c.key)) || [])}
                            className="btn-secondary w-full"
                            disabled={!report || dashLoading || reportLoading}
                        >
                            <HiOutlineDocumentDownload className="w-4 h-4" />
                            <span className="hidden xs:inline sm:hidden md:inline">Excel</span>
                        </button>
                        <button
                            onClick={() => handleExport('pdf', report?.columns?.filter((c: Column) => report.grouped ? true : !hiddenColumns.includes(c.key)) || [])}
                            className="btn-secondary w-full"
                            disabled={!report || dashLoading || reportLoading}
                        >
                            <HiOutlineDocumentDownload className="w-4 h-4" />
                            <span className="hidden xs:inline sm:hidden md:inline">PDF</span>
                        </button>
                    </div>
                </div>

                {/* Column Selector Dropdown */}
                {showColumns && report && !report.grouped && (
                    <div className="card card-body mt-2">
                        <p className="text-sm font-bold text-surface-900 mb-3">Visible Columns</p>
                        <div className="flex flex-wrap gap-3">
                            {report.columns.map((col: Column) => {
                                const isHidden = hiddenColumns.includes(col.key);
                                return (
                                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500"
                                            checked={!isHidden}
                                            onChange={() => {
                                                setHiddenColumns(prev =>
                                                    isHidden ? prev.filter(k => k !== col.key) : [...prev, col.key]
                                                );
                                            }}
                                        />
                                        <span className="text-surface-700">{col.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Results */}
                {reportLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
                    </div>
                ) : report ? (
                    <div>
                        {/* Summary info */}
                        <div className="flex items-center justify-between mb-3 mt-4">
                            <p className="text-xs text-surface-500">
                                {report.grouped
                                    ? `Grouped by ${report.groupLabel} • ${report.total} groups`
                                    : `${report.total} records found`}
                            </p>
                        </div>

                        {renderTable(report.data, report.columns.filter((c: Column) => !report.grouped ? !hiddenColumns.includes(c.key) : true))}

                        {/* Pagination for flat data */}
                        {!report.grouped && report.totalPages > 1 && (
                            <Pagination
                                page={page}
                                totalPages={report.totalPages}
                                onPageChange={setPage}
                            />
                        )}
                    </div>
                ) : null}
            </div>
        );
    };

    // ── Summary Tab ──────────────────────────────────────

    const summaryStats = React.useMemo(() => {
        if (!dash) return null;
        const companyData = dash.companyPerformance?.data || [];
        const dealerData = dash.dealerPerformance?.data || [];
        const totalPremium = companyData.reduce((s: number, c: any) => s + (c.premiumSum || 0), 0);
        const totalPolicies = companyData.reduce((s: number, c: any) => s + (c.count || 0), 0);
        return { companyData, dealerData, totalPremium, totalPolicies, topCompany: companyData[0], topDealer: dealerData[0] };
    }, [dash]);

    const renderSummary = () => {
        if (dashLoading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
                </div>
            );
        }
        if (!summaryStats) return null;
        const { companyData, dealerData, totalPremium, totalPolicies, topCompany, topDealer } = summaryStats;

        return (
            <div className="space-y-6">
                {/* Big KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card card-body text-center">
                        <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Total Policies</p>
                        <p className="text-3xl font-black text-surface-900 mt-2">{totalPolicies}</p>
                    </div>
                    <div className="card card-body text-center">
                        <p className="text-xs text-surface-500 font-medium uppercase tracking-wider truncate">Total Premium</p>
                        <p className="text-3xl font-black text-primary-600 mt-2" title={formatCurrency(totalPremium)}>{formatShortCurrency(totalPremium)}</p>
                    </div>
                    <div className="card card-body text-center">
                        <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Renewal Rate</p>
                        <p className="text-3xl font-black text-emerald-600 mt-2">
                            {dash.renewalStats?.successRate || 0}%
                        </p>
                    </div>
                    <div className="card card-body text-center">
                        <p className="text-xs text-surface-500 font-medium uppercase tracking-wider truncate">Top Company</p>
                        <p className="text-lg font-bold text-surface-900 mt-2 capitalize line-clamp-2 leading-tight min-h-[2.5rem] flex items-center justify-center">{topCompany?.name || '—'}</p>
                        <p className="text-xs text-surface-400 mt-1" title={formatCurrency(topCompany?.premiumSum || 0)}>{formatShortCurrency(topCompany?.premiumSum || 0)}</p>
                    </div>
                    <div className="card card-body text-center">
                        <p className="text-xs text-surface-500 font-medium uppercase tracking-wider truncate">Top Dealer</p>
                        <p className="text-lg font-bold text-surface-900 mt-2 capitalize line-clamp-2 leading-tight min-h-[2.5rem] flex items-center justify-center">{topDealer?.name || '—'}</p>
                        <p className="text-xs text-surface-400 mt-1" title={formatCurrency(topDealer?.premiumSum || 0)}>{formatShortCurrency(topDealer?.premiumSum || 0)}</p>
                    </div>
                    <div className="card card-body text-center">
                        <p className="text-xs text-surface-500 font-medium uppercase tracking-wider truncate">This Month</p>
                        <p className="text-lg font-bold text-surface-900 mt-2 truncate">
                            {dash.thisMonth?.policiesAdded || 0} policies
                        </p>
                        <p className="text-xs text-surface-400 mt-1" title={formatCurrency(dash.thisMonth?.totalPremium || 0)}>
                            {formatShortCurrency(dash.thisMonth?.totalPremium || 0)}
                        </p>
                    </div>
                </div>

                {/* Company-wise detail table */}
                {companyData.length > 0 && (
                    <div className="card card-body">
                        <h3 className="text-sm font-bold text-surface-900 mb-4">All Companies Performance</h3>
                        {renderTable(companyData, dash.companyPerformance?.columns || [])}
                    </div>
                )}

                {/* Dealer detail table */}
                {dealerData.length > 0 && (
                    <div className="card card-body">
                        <h3 className="text-sm font-bold text-surface-900 mb-4">All Dealers Performance</h3>
                        {renderTable(dealerData, dash.dealerPerformance?.columns || [])}
                    </div>
                )}
            </div>
        );
    };

    // ── MAIN RENDER ──────────────────────────────────────

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reports & Analytics</h1>
                    <p className="text-sm text-surface-500 mt-1">
                        Generate insights, compare performance, and export data
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 p-1 bg-surface-100 rounded-2xl w-full sm:w-fit overflow-x-auto hide-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-w-max flex-1 sm:flex-none ${activeTab === tab.id
                            ? 'bg-white text-surface-900 shadow-sm'
                            : 'text-surface-500 hover:text-surface-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4 shrink-0" />
                        <span className={`${activeTab === tab.id ? 'inline' : 'hidden sm:inline'} whitespace-nowrap`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'builder' && renderBuilder()}
            {activeTab === 'summary' && renderSummary()}
        </div>
    );
};

export default Reports;
