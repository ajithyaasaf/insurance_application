import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, formatCurrency, getStatusColor } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlineCalculator, HiOutlineSave, HiOutlineDocumentDownload, HiOutlineEye, HiOutlineTrash, HiOutlineCheckCircle } from 'react-icons/hi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Commissions: React.FC = () => {
    const [dealers, setDealers] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [pendingDealers, setPendingDealers] = useState<any[]>([]);
    const [detailModal, setDetailModal] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'calculator' | 'history'>('pending');

    // Pending filters
    const [pendingSearch, setPendingSearch] = useState('');

    // History filters
    const [historyDealerFilter, setHistoryDealerFilter] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState('');
    const [historyDateFrom, setHistoryDateFrom] = useState('');
    const [historyDateTo, setHistoryDateTo] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Calculator state
    const [dealerId, setDealerId] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [odPercentage, setOdPercentage] = useState('');
    const [tpPercentage, setTpPercentage] = useState('');
    const [notes, setNotes] = useState('');
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [showVolumeModal, setShowVolumeModal] = useState(false);
    const [volumePolicies, setVolumePolicies] = useState<any[]>([]);
    const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);

    useEffect(() => {
        const loadDealers = async () => {
            try {
                const res = await api.get('/dealers?limit=100');
                setDealers(res.data.data);
            } catch { }
        };
        loadDealers();
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const [histRes, pendRes] = await Promise.all([
                api.get('/commissions'),
                api.get('/commissions/pending')
            ]);
            setHistory(histRes.data.data);
            setPendingDealers(pendRes.data.data);
        } catch { toast.error('Failed to load commission data'); }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    useEffect(() => {
        if (dealerId && periodStart && periodEnd && activeTab === 'calculator') {
            const fetchStats = async () => {
                setLoadingStats(true);
                try {
                    const res = await api.get(`/commissions/stats`, {
                        params: { dealerId, periodStart, periodEnd }
                    });
                    setStats(res.data.data);
                } catch { setStats(null); }
                finally { setLoadingStats(false); }
            };
            fetchStats();
        } else {
            setStats(null);
            setVolumePolicies([]);
        }
    }, [dealerId, periodStart, periodEnd, activeTab]);

    const handlePeekVolume = async () => {
        setLoading(true);
        try {
            const res = await api.post('/commissions/preview', {
                dealerId,
                periodStart,
                periodEnd,
                odPercentage: 0,
                tpPercentage: 0,
            });
            setVolumePolicies(res.data.data.policies);
            setShowVolumeModal(true);
        } catch { toast.error('Failed to load preview'); }
        finally { setLoading(false); }
    };

    const handlePreview = async () => {
        if (!dealerId || !periodStart || !periodEnd || !odPercentage || !tpPercentage) {
            toast.error('Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/commissions/preview', {
                dealerId,
                periodStart,
                periodEnd,
                odPercentage: parseFloat(odPercentage),
                tpPercentage: parseFloat(tpPercentage),
            });
            setPreview(res.data.data);
            setSelectedPolicyIds(res.data.data.policies.map((p: any) => p.policyId));
            if (res.data.data.policies.length === 0) {
                toast('No policies found for this dealer in the selected period', { icon: 'ℹ️' });
            }
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error fetching preview'); }
        finally { setLoading(false); }
    };

    const handleProcessPending = (pd: any) => {
        setDealerId(pd.dealerId);
        setPeriodStart(pd.oldestPolicyDate.split('T')[0]);
        // Use newestPolicyDate or Today, whichever is LATER
        const latestDate = new Date(pd.newestPolicyDate);
        const today = new Date();
        const end = latestDate > today ? latestDate : today;
        setPeriodEnd(end.toISOString().split('T')[0]);
        setActiveTab('calculator');
    };

    const handleSave = async () => {
        if (!preview || preview.policies.length === 0) return;
        setSaving(true);
        try {
            await api.post('/commissions', {
                dealerId,
                periodStart,
                periodEnd,
                odPercentage: parseFloat(odPercentage),
                tpPercentage: parseFloat(tpPercentage),
                notes: notes || undefined,
                policyIds: selectedPolicyIds,
            });
            toast.success('Commission record saved!');
            setPreview(null);
            setNotes('');
            fetchHistory();
            setActiveTab('history');
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error saving'); }
        finally { setSaving(false); }
    };

    const handleMarkPaid = async (id: string) => {
        try {
            await api.put(`/commissions/${id}`, { status: 'paid' });
            toast.success('Marked as paid');
            fetchHistory();
            if (detailModal?.id === id) {
                setDetailModal({ ...detailModal, status: 'paid' });
            }
        } catch { toast.error('Failed to update'); }
    };

    const handleBulkMarkPaid = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Mark ${selectedIds.length} records as paid?`)) return;
        try {
            await api.put('/commissions/bulk-status', { ids: selectedIds, status: 'paid' });
            toast.success(`Marked ${selectedIds.length} as paid`);
            setSelectedIds([]);
            fetchHistory();
        } catch { toast.error('Bulk update failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this commission record?')) return;
        try {
            await api.delete(`/commissions/${id}`);
            toast.success('Deleted');
            fetchHistory();
            if (detailModal?.id === id) setDetailModal(null);
        } catch { toast.error('Failed to delete'); }
    };

    const viewDetail = async (id: string) => {
        try {
            const res = await api.get(`/commissions/${id}`);
            setDetailModal(res.data.data);
        } catch { toast.error('Failed to load details'); }
    };

    const filteredHistory = history.filter(c => {
        if (historyDealerFilter && c.dealerId !== historyDealerFilter) return false;
        if (historyStatusFilter && c.status !== historyStatusFilter) return false;
        if (historyDateFrom && new Date(c.periodStart) < new Date(historyDateFrom)) return false;
        if (historyDateTo) {
            const to = new Date(historyDateTo);
            to.setUTCHours(23, 59, 59, 999);
            if (new Date(c.periodStart) > to) return false;
        }
        return true;
    });

    const filteredPending = pendingDealers.filter(pd => 
        pd.dealerName.toLowerCase().includes(pendingSearch.toLowerCase())
    );

    const exportToExcel = async () => {
        if (filteredHistory.length === 0) {
            toast.error('No records to export');
            return;
        }

        try {
            toast.loading('Generating Excel...', { id: 'export-excel' });
            
            const reqBody: any = {};
            if (historyDealerFilter) reqBody.dealerId = historyDealerFilter;
            if (historyStatusFilter) reqBody.status = historyStatusFilter;
            if (historyDateFrom) reqBody.dateFrom = historyDateFrom;
            if (historyDateTo) reqBody.dateTo = historyDateTo;

            const res = await api.post('/commissions/export', reqBody, { responseType: 'blob' });

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Commission_History_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast.success('Excel downloaded!', { id: 'export-excel' });
        } catch {
            toast.error('Failed to export', { id: 'export-excel' });
        }
    };

    const exportPDF = (data: any) => {
        const doc = new jsPDF();
        const dealerName = data.dealer?.name || 'Dealer';

        // Title
        doc.setFontSize(16);
        doc.text('Commission Report', 14, 20);
        doc.setFontSize(10);
        doc.text(`Dealer: ${dealerName}`, 14, 30);
        doc.text(`Period: ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`, 14, 36);
        doc.text(`OD%: ${data.odPercentage}%  |  TP%: ${data.tpPercentage}%`, 14, 42);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 48);

        // Policy table
        const policies = data.commissionPolicies || data.policies || [];
        autoTable(doc, {
            startY: 55,
            head: [['Vehicle No', 'Make', 'Model', 'OD', 'TP', 'Premium', 'OD Comm.', 'TP Comm.', 'Total']],
            body: policies.map((p: any) => [
                p.vehicleNumber || '-',
                p.make || '-',
                p.model || '-',
                `₹${(p.od || 0).toLocaleString('en-IN')}`,
                `₹${(p.tp || 0).toLocaleString('en-IN')}`,
                `₹${(p.premiumAmount || 0).toLocaleString('en-IN')}`,
                `₹${(p.odCommission || 0).toLocaleString('en-IN')}`,
                `₹${(p.tpCommission || 0).toLocaleString('en-IN')}`,
                `₹${((p.odCommission || 0) + (p.tpCommission || 0)).toLocaleString('en-IN')}`,
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
        });

        // Summary
        const finalY = (doc as any).lastAutoTable?.finalY || 120;
        doc.setFontSize(11);
        doc.text(`Total OD Commission: ₹${(data.totalOdCommission || data.summary?.totalOdCommission || 0).toLocaleString('en-IN')}`, 14, finalY + 10);
        doc.text(`Total TP Commission: ₹${(data.totalTpCommission || data.summary?.totalTpCommission || 0).toLocaleString('en-IN')}`, 14, finalY + 17);
        doc.setFontSize(13);
        doc.text(`Grand Total: ₹${(data.totalCommission || data.summary?.totalCommission || 0).toLocaleString('en-IN')}`, 14, finalY + 27);

        doc.save(`commission_${dealerName}_${data.periodStart?.split('T')[0] || 'report'}.pdf`);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Commissions</h1>
                <div className="flex bg-surface-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pending' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
                    >
                        Pending Queue {pendingDealers.length > 0 && <span className="ml-1.5 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">{pendingDealers.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('calculator')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calculator' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
                    >
                        Calculator
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white text-primary-700 shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}
                    >
                        History ({history.length})
                    </button>
                </div>
            </div>

            {activeTab === 'pending' && (
                <div className="card card-body space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-surface-900">Unprocessed Commissions</h2>
                        <input 
                            type="text" 
                            placeholder="Search dealer..." 
                            className="input w-64"
                            value={pendingSearch}
                            onChange={(e) => setPendingSearch(e.target.value)}
                        />
                    </div>

                    {filteredPending.length === 0 ? (
                        <EmptyState message="All caught up! No pending commissions found." icon={<HiOutlineCheckCircle className="w-12 h-12 text-emerald-500" />} />
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Dealer Info</th>
                                        <th>Unpaid Policies</th>
                                        <th>Oldest Policy Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPending.map(pd => (
                                        <tr key={pd.dealerId} className="hover:bg-surface-50 transition-colors">
                                            <td>
                                                <p className="font-bold text-surface-900">{pd.dealerName}</p>
                                                <p className="text-xs text-surface-500">{pd.dealerPhone || 'No phone'}</p>
                                            </td>
                                            <td>
                                                <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    {pd.unprocessedCount} Policies
                                                </span>
                                            </td>
                                            <td className="text-surface-600 font-medium">{formatDate(pd.oldestPolicyDate)}</td>
                                            <td>
                                                <button 
                                                    onClick={() => handleProcessPending(pd)}
                                                    className="btn-primary btn-sm"
                                                >
                                                    <HiOutlineCalculator className="w-4 h-4 mr-1" /> Process
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'calculator' && (
                <div className="space-y-4 animate-fade-in">
                    {/* High-Volume Insight Card */}
                    {dealerId && periodStart && periodEnd && (
                        <div className="card border-l-4 border-primary-500 overflow-hidden bg-white shadow-sm animate-slide-up">
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Business Context</p>
                                        {loadingStats && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-ping"></div>}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-3xl font-black text-surface-900 leading-none">{stats ? stats.policyCount : '0'}</h3>
                                        <span className="text-xs font-semibold text-surface-600">Pending Policies</span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        {stats?.policyCount > 20 && (
                                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                                <HiOutlineCalculator className="w-2.5 h-2.5" /> High Volume
                                            </span>
                                        )}
                                        {stats?.policyCount > 0 && (
                                            <button 
                                                onClick={handlePeekVolume}
                                                className="text-[10px] font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-0.5"
                                            >
                                                <HiOutlineEye className="w-3 h-3" /> Preview List
                                            </button>
                                        )}
                                    </div>
                                    {stats?.topMakes?.length > 0 && stats.policyCount > 20 && (
                                        <p className="text-[9px] text-surface-500 italic mt-1">
                                            Top Models: {stats.topMakes.map((m: any) => m.make).join(', ')}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6 border-l border-surface-100 pl-6">
                                    <div>
                                        <p className="text-[10px] font-extrabold text-blue-500 uppercase mb-0.5">Total OD Volume</p>
                                        <p className="text-xl font-bold text-surface-900">{stats ? formatCurrency(stats.totalOdPremium) : '₹0'}</p>
                                        <p className="text-[9px] text-surface-400 mt-1">Found in current range</p>
                                    </div>
                                    <div className="border-l border-surface-50 pl-4">
                                        <p className="text-[10px] font-extrabold text-purple-500 uppercase mb-0.5">Total TP Volume</p>
                                        <p className="text-xl font-bold text-surface-900">{stats ? formatCurrency(stats.totalTpPremium) : '₹0'}</p>
                                        <p className="text-[9px] text-surface-400 mt-1">Unprocessed total</p>
                                    </div>
                                </div>

                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1">
                                        <HiOutlineSave className="w-8 h-8 text-emerald-200/50 -rotate-12" />
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Live Commission Est.</p>
                                    <div className="flex justify-between items-baseline relative z-10">
                                        <p className="text-3xl font-black text-emerald-700 tabular-nums">
                                            {stats && (odPercentage || tpPercentage) 
                                                ? formatCurrency((stats.totalOdPremium * (parseFloat(odPercentage) || 0) / 100) + (stats.totalTpPremium * (parseFloat(tpPercentage) || 0) / 100))
                                                : formatCurrency(0)
                                            }
                                        </p>
                                    </div>
                                    <div className="mt-2 h-1 bg-emerald-200/50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-500" 
                                            style={{ width: `${Math.min((parseFloat(odPercentage) || 0) + (parseFloat(tpPercentage) || 0), 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter Panel */}
                    <div className="card card-body">
                        <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center justify-between">
                            <span>Commission Calculator</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="label">Dealer *</label>
                                <SearchableSelect
                                    options={dealers.map(d => ({ value: d.id, label: d.name }))}
                                    value={dealerId}
                                    onChange={setDealerId}
                                    placeholder="Select Dealer"
                                />
                            </div>
                            <div>
                                <label className="label">Period Start *</label>
                                <input type="date" className="input" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                            </div>
                            <div>
                                <label className="label">Period End *</label>
                                <input type="date" className="input" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                            </div>
                            <div>
                                <label className="label">OD % *</label>
                                <input type="number" min="0" max="100" step="0.1" className="input" placeholder="e.g. 10" value={odPercentage} onChange={e => setOdPercentage(e.target.value)} />
                            </div>
                            <div>
                                <label className="label">TP % *</label>
                                <input type="number" min="0" max="100" step="0.1" className="input" placeholder="e.g. 5" value={tpPercentage} onChange={e => setTpPercentage(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={handlePreview} disabled={loading} className="btn-primary">
                                {loading ? 'Calculating...' : <><HiOutlineCalculator className="w-4 h-4" /> Calculate</>}
                            </button>
                        </div>
                    </div>

                    {/* Preview Table */}
                    {preview && (
                        <div className="card card-body space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-surface-900">
                                    {preview.dealer.name} — {preview.summary.policyCount} Policies
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => exportPDF(preview)} className="btn-secondary btn-sm">
                                        <HiOutlineDocumentDownload className="w-4 h-4" /> Export PDF
                                    </button>
                                </div>
                            </div>

                            {preview.alreadyProcessedCount > 0 && (
                                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-4 border border-amber-200">
                                    <strong>Note:</strong> {preview.alreadyProcessedCount} {preview.alreadyProcessedCount === 1 ? 'policy' : 'policies'} in this date range {preview.alreadyProcessedCount === 1 ? 'has' : 'have'} already been processed.
                                </div>
                            )}

                            {preview.policies.length === 0 ? (
                                <EmptyState 
                                    message={
                                        preview.alreadyProcessedCount > 0 
                                            ? `All ${preview.alreadyProcessedCount} policies for this period were already processed.` 
                                            : "No policies found for this dealer in the selected period"
                                    } 
                                    icon={<HiOutlineCalculator className="w-12 h-12" />} 
                                />
                            ) : (
                                <>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th className="w-10">
                                                        <input 
                                                            type="checkbox" 
                                                            className="checkbox" 
                                                            checked={preview.policies.length > 0 && selectedPolicyIds.length === preview.policies.length}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedPolicyIds(preview.policies.map((p: any) => p.policyId));
                                                                else setSelectedPolicyIds([]);
                                                            }}
                                                        />
                                                    </th>
                                                    <th>Vehicle No</th>
                                                    <th>Make</th>
                                                    <th>Model</th>
                                                    <th>Class</th>
                                                    <th className="text-right">OD</th>
                                                    <th className="text-right">TP</th>
                                                    <th className="text-right">Premium</th>
                                                    <th>Policy Start</th>
                                                    <th>Policy End</th>
                                                    <th className="text-right">OD Comm.</th>
                                                    <th className="text-right">TP Comm.</th>
                                                    <th className="text-right font-bold text-primary-700">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.policies.map((p: any, i: number) => (
                                                    <tr key={i} className={!selectedPolicyIds.includes(p.policyId) ? 'opacity-50 grayscale bg-surface-50' : ''}>
                                                        <td>
                                                            <input 
                                                                type="checkbox" 
                                                                className="checkbox" 
                                                                checked={selectedPolicyIds.includes(p.policyId)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedPolicyIds([...selectedPolicyIds, p.policyId]);
                                                                    else setSelectedPolicyIds(selectedPolicyIds.filter(id => id !== p.policyId));
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="font-medium">{p.vehicleNumber || '-'}</td>
                                                        <td>{p.make || '-'}</td>
                                                        <td>{p.model || '-'}</td>
                                                        <td>{p.vehicleClass || '-'}</td>
                                                        <td className="text-right">{formatCurrency(p.od)}</td>
                                                        <td className="text-right">{formatCurrency(p.tp)}</td>
                                                        <td className="text-right font-medium">{formatCurrency(p.premiumAmount)}</td>
                                                        <td>{formatDate(p.startDate)}</td>
                                                        <td>{formatDate(p.expiryDate)}</td>
                                                        <td className="text-right text-emerald-600 font-medium">{formatCurrency(p.odCommission)}</td>
                                                        <td className="text-right text-emerald-600 font-medium">{formatCurrency(p.tpCommission)}</td>
                                                        <td className="text-right text-emerald-700 font-bold">{formatCurrency(p.totalCommission)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Summary */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-surface-200">
                                        <div className="text-center p-3 bg-surface-50 rounded-xl">
                                            <p className="text-xs text-surface-500">Selected Premium</p>
                                            <p className="text-lg font-bold text-surface-900">
                                                {formatCurrency(preview.policies.filter((p: any) => selectedPolicyIds.includes(p.policyId)).reduce((s: number, p: any) => s + p.premiumAmount, 0))}
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                                            <p className="text-xs text-blue-600">OD Commission</p>
                                            <p className="text-lg font-bold text-blue-700">
                                                {formatCurrency(preview.policies.filter((p: any) => selectedPolicyIds.includes(p.policyId)).reduce((s: number, p: any) => s + p.odCommission, 0))}
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                                            <p className="text-xs text-purple-600">TP Commission</p>
                                            <p className="text-lg font-bold text-purple-700">
                                                {formatCurrency(preview.policies.filter((p: any) => selectedPolicyIds.includes(p.policyId)).reduce((s: number, p: any) => s + p.tpCommission, 0))}
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-emerald-50 rounded-xl shadow-inner border border-emerald-100">
                                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Grand Total</p>
                                            <p className="text-xl font-black text-emerald-700">
                                                {formatCurrency(preview.policies.filter((p: any) => selectedPolicyIds.includes(p.policyId)).reduce((s: number, p: any) => s + p.totalCommission, 0))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Notes & Save */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-surface-200">
                                        <textarea
                                            className="input flex-1"
                                            rows={2}
                                            placeholder="Add notes (optional)..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                        />
                                        <button 
                                            onClick={handleSave} 
                                            disabled={saving || selectedPolicyIds.length === 0} 
                                            className="btn-primary self-end"
                                        >
                                            {saving ? 'Saving...' : <><HiOutlineSave className="w-4 h-4" /> Save {selectedPolicyIds.length} Policies</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="card card-body space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-lg font-semibold text-surface-900">Commission History</h2>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <input type="date" className="input w-full sm:w-[140px]" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} title="From Date" />
                            <input type="date" className="input w-full sm:w-[140px]" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} title="To Date" />
                            <SearchableSelect
                                className="w-full sm:w-[180px]"
                                options={dealers.map(d => ({ value: d.id, label: d.name }))}
                                value={historyDealerFilter}
                                onChange={setHistoryDealerFilter}
                                allLabel="All Dealers"
                                placeholder="Filter Dealer"
                            />
                            <SearchableSelect
                                className="w-full sm:w-[140px]"
                                options={[
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'paid', label: 'Paid' }
                                ]}
                                value={historyStatusFilter}
                                onChange={setHistoryStatusFilter}
                                allLabel="All Status"
                                placeholder="Filter Status"
                            />
                            <button onClick={exportToExcel} className="btn-secondary whitespace-nowrap">
                                <HiOutlineDocumentDownload className="w-4 h-4 mr-1" /> Export Excel
                            </button>
                            {selectedIds.length > 0 && (
                                <button onClick={handleBulkMarkPaid} className="btn-primary animate-bounce-in whitespace-nowrap">
                                    <HiOutlineCheckCircle className="w-4 h-4 mr-1" /> Mark {selectedIds.length} Paid
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                        <EmptyState message="No commission records yet" icon={<HiOutlineCalculator className="w-12 h-12" />} />
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input 
                                                type="checkbox" 
                                                className="checkbox"
                                                checked={selectedIds.length > 0 && selectedIds.length === filteredHistory.filter(c => c.status === 'draft').length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds(filteredHistory.filter(c => c.status === 'draft').map(c => c.id));
                                                    } else {
                                                        setSelectedIds([]);
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th>Dealer</th>
                                        <th>Period</th>
                                        <th>OD%</th>
                                        <th>TP%</th>
                                        <th>Policies</th>
                                        <th>Total Commission</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map((c: any) => (
                                        <tr key={c.id} className={selectedIds.includes(c.id) ? 'bg-primary-50' : ''}>
                                            <td>
                                                {c.status === 'draft' && (
                                                    <input 
                                                        type="checkbox" 
                                                        className="checkbox" 
                                                        checked={selectedIds.includes(c.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedIds([...selectedIds, c.id]);
                                                            else setSelectedIds(selectedIds.filter(id => id !== c.id));
                                                        }}
                                                    />
                                                )}
                                            </td>
                                            <td className="font-medium">{c.dealer?.name}</td>
                                            <td className="text-xs">
                                                {formatDate(c.periodStart)} — {formatDate(c.periodEnd)}
                                            </td>
                                            <td>{c.odPercentage}%</td>
                                            <td>{c.tpPercentage}%</td>
                                            <td>{c._count?.commissionPolicies || 0}</td>
                                            <td className="font-bold text-emerald-700">{formatCurrency(c.totalCommission)}</td>
                                            <td>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => viewDetail(c.id)} className="btn-ghost btn-sm text-primary-600" title="View"><HiOutlineEye className="w-3.5 h-3.5" /></button>
                                                    {c.status === 'draft' && (
                                                        <button onClick={() => handleMarkPaid(c.id)} className="btn-ghost btn-sm text-emerald-600" title="Mark Paid"><HiOutlineCheckCircle className="w-3.5 h-3.5" /></button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDelete(c.id)} 
                                                        className={`btn-ghost btn-sm ${c.status === 'paid' ? 'text-surface-300 cursor-not-allowed' : 'text-red-500'}`} 
                                                        title={c.status === 'paid' ? 'Cannot delete paid records' : 'Delete'}
                                                        disabled={c.status === 'paid'}
                                                    >
                                                        <HiOutlineTrash className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Commission Details" size="lg">
                {detailModal && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div><p className="text-xs text-surface-500">Dealer</p><p className="font-semibold">{detailModal.dealer?.name}</p></div>
                            <div><p className="text-xs text-surface-500">Period</p><p className="font-semibold text-sm">{formatDate(detailModal.periodStart)} — {formatDate(detailModal.periodEnd)}</p></div>
                            <div><p className="text-xs text-surface-500">OD% / TP%</p><p className="font-semibold">{detailModal.odPercentage}% / {detailModal.tpPercentage}%</p></div>
                            <div><p className="text-xs text-surface-500">Status</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detailModal.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {detailModal.status}
                                </span>
                            </div>
                        </div>

                        {detailModal.notes && (
                            <div className="bg-surface-50 p-3 rounded-lg">
                                <p className="text-xs text-surface-500">Notes</p>
                                <p className="text-sm">{detailModal.notes}</p>
                            </div>
                        )}

                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr><th>Vehicle</th><th>Make</th><th>Model</th><th>OD</th><th>TP</th><th>Premium</th><th>OD Comm.</th><th>TP Comm.</th></tr>
                                </thead>
                                <tbody>
                                    {detailModal.commissionPolicies?.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className="font-medium">{p.vehicleNumber || '-'}</td>
                                            <td>{p.make || '-'}</td>
                                            <td>{p.model || '-'}</td>
                                            <td>{formatCurrency(p.od)}</td>
                                            <td>{formatCurrency(p.tp)}</td>
                                            <td>{formatCurrency(p.premiumAmount)}</td>
                                            <td className="text-emerald-600">{formatCurrency(p.odCommission)}</td>
                                            <td className="text-emerald-600">{formatCurrency(p.tpCommission)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-surface-200">
                            <div className="text-center p-3 bg-blue-50 rounded-xl">
                                <p className="text-xs text-blue-600">OD Commission</p>
                                <p className="text-lg font-bold text-blue-700">{formatCurrency(detailModal.totalOdCommission)}</p>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-xl">
                                <p className="text-xs text-purple-600">TP Commission</p>
                                <p className="text-lg font-bold text-purple-700">{formatCurrency(detailModal.totalTpCommission)}</p>
                            </div>
                            <div className="text-center p-3 bg-emerald-50 rounded-xl">
                                <p className="text-xs text-emerald-600">Grand Total</p>
                                <p className="text-xl font-bold text-emerald-700">{formatCurrency(detailModal.totalCommission)}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => exportPDF(detailModal)} className="btn-secondary flex-1">
                                <HiOutlineDocumentDownload className="w-4 h-4" /> Export PDF
                            </button>
                            {detailModal.status === 'draft' && (
                                <button onClick={() => handleMarkPaid(detailModal.id)} className="btn-primary flex-1">
                                    <HiOutlineCheckCircle className="w-4 h-4" /> Mark as Paid
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Volume Preview Modal */}
            <Modal isOpen={showVolumeModal} onClose={() => setShowVolumeModal(false)} title="Policies in Range (Unprocessed)" size="lg">
                <div className="space-y-4">
                    <p className="text-sm text-surface-500">
                        This is a quick preview of the {volumePolicies.length} policies found for this period. 
                        No commissions are calculated yet.
                    </p>
                    <div className="table-container max-h-[60vh] overflow-auto border rounded-lg">
                        <table className="table table-compact">
                            <thead className="sticky top-0 bg-surface-50 z-10">
                                <tr>
                                    <th>Date</th>
                                    <th>Vehicle No</th>
                                    <th>Make / Model</th>
                                    <th className="text-right">OD Premium</th>
                                    <th className="text-right">TP Premium</th>
                                </tr>
                            </thead>
                            <tbody>
                                {volumePolicies.map((p, i) => (
                                    <tr key={i} className="text-xs">
                                        <td>{formatDate(p.startDate)}</td>
                                        <td className="font-medium">{p.vehicleNumber || '-'}</td>
                                        <td>{p.make} {p.model}</td>
                                        <td className="text-right font-semibold text-blue-600">{formatCurrency(p.od)}</td>
                                        <td className="text-right font-semibold text-purple-600">{formatCurrency(p.tp)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setShowVolumeModal(false)} className="btn-secondary">Close</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Commissions;
