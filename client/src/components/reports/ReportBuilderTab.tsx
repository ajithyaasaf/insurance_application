import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    HiOutlineTable, 
    HiOutlineFilter, 
    HiOutlineRefresh, 
    HiOutlineAdjustments, 
    HiOutlineDocumentDownload 
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import api from '../../api/client';
import SearchableSelect from '../ui/SearchableSelect';
import Pagination from '../ui/Pagination';
import ReportTable from './ReportTable';
import { 
    POLICY_TYPES, VEHICLE_CLASSES, POLICY_STATUSES, 
    PAYMENT_STATUSES, CLAIM_STATUSES, FOLLOWUP_STATUSES 
} from '../../utils/constants';

type Source = 'policies' | 'payments' | 'claims' | 'customers' | 'followups';
type GroupBy = 'company' | 'dealer' | 'policyType' | 'vehicleClass' | 'status' | 'month' | 'policyOrigin' | '';

interface Column { key: string; label: string }
interface ReportFilters {
    companyId?: string;
    dealerId?: string;
    policyType?: string;
    vehicleClass?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    policyOrigin?: string;
}

const SOURCE_OPTIONS: { value: Source; label: string; icon: React.ElementType }[] = [
    { value: 'policies', label: 'Policies', icon: HiOutlineTable },
    { value: 'payments', label: 'Payments', icon: HiOutlineRefresh },
    { value: 'claims', label: 'Claims', icon: HiOutlineDocumentDownload },
    { value: 'customers', label: 'Customers', icon: HiOutlineTable },
    { value: 'followups', label: 'Follow-ups', icon: HiOutlineRefresh },
];

function getStatusOptions(source: Source): string[] {
    switch (source) {
        case 'policies': return POLICY_STATUSES;
        case 'payments': return PAYMENT_STATUSES;
        case 'claims': return CLAIM_STATUSES;
        case 'followups': return FOLLOWUP_STATUSES;
        default: return [];
    }
}

function getGroupOptions(source: Source): { value: GroupBy; label: string }[] {
    switch (source) {
        case 'policies': return [
            { value: 'company', label: 'By Company' },
            { value: 'dealer', label: 'By Dealer' },
            { value: 'policyType', label: 'By Policy Type' },
            { value: 'vehicleClass', label: 'By Vehicle Class' },
            { value: 'status', label: 'By Status' },
            { value: 'policyOrigin', label: 'By Policy Origin' },
            { value: 'month', label: 'By Month' },
        ];
        case 'payments': return [
            { value: 'status', label: 'By Status' },
            { value: 'month', label: 'By Month' },
        ];
        default: return [];
    }
}

const ReportBuilderTab: React.FC = () => {
    const [localFilters, setLocalFilters] = useState<ReportFilters>({});
    const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({});
    const [localGroupBy, setLocalGroupBy] = useState<GroupBy>('');
    const [appliedGroupBy, setAppliedGroupBy] = useState<GroupBy>('');
    const [source, setSource] = useState<Source>('policies');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
    const [showColumns, setShowColumns] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
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

    // --- Report builder data ---
    const { data: reportData, isLoading: reportLoading } = useQuery({
        queryKey: ['report-generate', source, appliedGroupBy, appliedFilters, page],
        queryFn: () => api.post('/reports/generate', {
            source,
            filters: Object.fromEntries(Object.entries(appliedFilters).filter(([_, v]) => v)),
            groupBy: appliedGroupBy || undefined,
            page,
            limit,
        }).then(r => r.data),
    });
    const report = reportData?.data;

    const updateLocalFilter = useCallback((key: keyof ReportFilters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value || undefined }));
        setIsDirty(true);
    }, []);

    const generateReport = useCallback(() => {
        setAppliedFilters(localFilters);
        setAppliedGroupBy(localGroupBy);
        setPage(1);
        setIsDirty(false);
    }, [localFilters, localGroupBy]);

    const clearFilters = useCallback(() => {
        setLocalFilters({});
        setAppliedFilters({});
        setLocalGroupBy('');
        setAppliedGroupBy('');
        setPage(1);
        setHiddenColumns([]);
        setIsDirty(false);
    }, []);

    const handleExport = useCallback(async (format: 'xlsx' | 'pdf', cols: Column[]) => {
        try {
            toast.loading(`Generating ${format.toUpperCase()}...`, { id: 'export' });
            const res = await api.post('/reports/export', {
                source,
                filters: Object.fromEntries(Object.entries(appliedFilters).filter(([_, v]) => v)),
                groupBy: appliedGroupBy || undefined,
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
    }, [source, appliedFilters, appliedGroupBy]);

    const statuses = getStatusOptions(source);
    const groupOptions = getGroupOptions(source);
    const showCompanyFilter = ['policies', 'payments', 'claims', 'followups'].includes(source);
    const showDealerFilter = ['policies', 'payments'].includes(source);
    const showPolicyTypeFilter = ['policies', 'payments', 'claims', 'followups'].includes(source);
    const showVehicleClassFilter = source === 'policies' && localFilters.policyType === 'motor';

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
                            onClick={() => {
                                setSource(opt.value);
                                setLocalGroupBy('');
                                setAppliedGroupBy('');
                                setLocalFilters({});
                                setAppliedFilters({});
                                setPage(1);
                                setHiddenColumns([]);
                                setShowColumns(false);
                                setIsDirty(false);
                            }}
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
                    {groupOptions.length > 0 && (
                        <div>
                            <label className="label">Group By</label>
                            <SearchableSelect
                                options={groupOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                                value={localGroupBy}
                                onChange={val => { setLocalGroupBy(val as GroupBy); setIsDirty(true); }}
                                allLabel="No Grouping"
                                placeholder="Select grouping..."
                            />
                        </div>
                    )}

                    {/* Company */}
                    {showCompanyFilter && (
                        <div>
                            <label className="label">Company</label>
                            <SearchableSelect
                                options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
                                value={localFilters.companyId || ''}
                                onChange={val => updateLocalFilter('companyId', val)}
                                allLabel="All Companies"
                                placeholder="Search company..."
                            />
                        </div>
                    )}

                    {/* Dealer */}
                    {showDealerFilter && (
                        <div>
                            <label className="label">Dealer</label>
                            <SearchableSelect
                                options={dealers.map((d: any) => ({ value: d.id, label: d.name }))}
                                value={localFilters.dealerId || ''}
                                onChange={val => updateLocalFilter('dealerId', val)}
                                allLabel="All Dealers"
                                placeholder="Search dealer..."
                            />
                        </div>
                    )}

                    {/* Policy Type */}
                    {showPolicyTypeFilter && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Policy Type</label>
                                <SearchableSelect
                                    options={POLICY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                                    value={localFilters.policyType || ''}
                                    onChange={val => updateLocalFilter('policyType', val)}
                                    allLabel="All Types"
                                    placeholder="Select policy type..."
                                />
                            </div>
                            {source === 'policies' && (
                                <div>
                                    <label className="label">Policy Origin</label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'fresh', label: 'Fresh' },
                                            { value: 'external_renewal', label: 'External Renewal' },
                                            { value: 'in_system_renewal', label: 'In-System Renewal' },
                                        ]}
                                        value={localFilters.policyOrigin || ''}
                                        onChange={val => updateLocalFilter('policyOrigin', val)}
                                        allLabel="All Origins"
                                        placeholder="Select origin..."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Vehicle Class */}
                    {showVehicleClassFilter && (
                        <div>
                            <label className="label">Vehicle Class</label>
                            <SearchableSelect
                                options={VEHICLE_CLASSES.map(t => ({ value: t, label: t.replace('_', ' ') }))}
                                value={localFilters.vehicleClass || ''}
                                onChange={val => updateLocalFilter('vehicleClass', val)}
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
                                value={localFilters.status || ''}
                                onChange={val => updateLocalFilter('status', val)}
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
                            value={localFilters.dateFrom || ''}
                            onChange={e => updateLocalFilter('dateFrom', e.target.value)}
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="label">Date To</label>
                        <input
                            type="date"
                            className="input"
                            value={localFilters.dateTo || ''}
                            onChange={e => updateLocalFilter('dateTo', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
                <button
                    onClick={generateReport}
                    className={`btn-primary w-full sm:w-auto ${isDirty ? 'ring-2 ring-offset-2 ring-primary-400' : ''}`}
                    disabled={reportLoading}
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${reportLoading ? 'animate-spin' : ''}`} />
                    {isDirty ? 'Apply & Generate' : 'Generate Report'}
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
                        disabled={!report || reportLoading}
                    >
                        <HiOutlineDocumentDownload className="w-4 h-4" />
                        <span className="hidden xs:inline sm:hidden md:inline">Excel</span>
                    </button>
                    <button
                        onClick={() => handleExport('pdf', report?.columns?.filter((c: Column) => report.grouped ? true : !hiddenColumns.includes(c.key)) || [])}
                        className="btn-secondary w-full"
                        disabled={!report || reportLoading}
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

                    <ReportTable 
                        data={report.data} 
                        columns={report.columns.filter((c: Column) => !report.grouped ? !hiddenColumns.includes(c.key) : true)} 
                    />

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

export default ReportBuilderTab;
