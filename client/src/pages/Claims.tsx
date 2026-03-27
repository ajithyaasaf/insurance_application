import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, formatCurrency, getStatusColor } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineShieldCheck } from 'react-icons/hi';

const Claims: React.FC = () => {
    const [claims, setClaims] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        customerId: '', policyId: '', claimNumber: '', claimAmount: '', claimDate: '', reason: '',
    });

    const fetchClaims = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/claims', { params: { page, limit: 20, search: search || undefined } });
            setClaims(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch claims'); } finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchClaims(); }, [fetchClaims]);

    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                const [custRes, polRes] = await Promise.all([api.get('/customers?limit=100'), api.get('/policies?limit=100')]);
                setCustomers(custRes.data.data);
                setPolicies(polRes.data.data);
            } catch { }
        };
        loadDropdowns();
    }, []);

    const openCreate = () => {
        setForm({ customerId: '', policyId: '', claimNumber: '', claimAmount: '', claimDate: new Date().toISOString().split('T')[0], reason: '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/claims', { ...form, claimAmount: parseFloat(form.claimAmount) });
            toast.success('Claim filed');
            setModalOpen(false);
            fetchClaims(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Claims</h1>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> File Claim</button>
            </div>

            <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-10" placeholder="Search by customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : claims.length === 0 ? (
                <EmptyState message="No claims found" icon={<HiOutlineShieldCheck className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="table-container hidden sm:block">
                        <table className="table">
                            <thead><tr><th>Customer</th><th>Policy</th><th>Claim #</th><th>Amount</th><th>Date</th><th>Status</th><th>Reason</th></tr></thead>
                            <tbody>
                                {claims.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-medium text-surface-900">{c.customer?.name}</td>
                                        <td className="text-xs">{c.policy?.productName || c.policy?.policyType}</td>
                                        <td className="text-xs">{c.claimNumber || '—'}</td>
                                        <td className="font-medium">{formatCurrency(c.claimAmount)}</td>
                                        <td className="text-xs">{formatDate(c.claimDate)}</td>
                                        <td><span className={getStatusColor(c.status)}>{c.status}</span></td>
                                        <td className="text-xs text-surface-500 max-w-[150px] truncate">{c.reason || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="sm:hidden space-y-3">
                        {claims.map((c) => (
                            <div key={c.id} className="card card-body">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-surface-900">{c.customer?.name}</p>
                                        <p className="text-xs text-surface-500">{c.policy?.productName || c.policy?.policyType}</p>
                                    </div>
                                    <span className={getStatusColor(c.status)}>{c.status}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>{formatCurrency(c.claimAmount)}</span>
                                    <span className="text-xs text-surface-500">{formatDate(c.claimDate)}</span>
                                </div>
                                {c.reason && <p className="text-xs text-surface-500 mt-1">{c.reason}</p>}
                            </div>
                        ))}
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchClaims(p)} />
                </>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="File New Claim">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="label">Customer *</label>
                        <select className="select" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                            <option value="">Select</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div><label className="label">Policy *</label>
                        <select className="select" required value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })}>
                            <option value="">Select</option>
                            {policies.filter(p => !form.customerId || p.customerId === form.customerId).map(p => (
                                <option key={p.id} value={p.id}>{p.productName || p.policyType} • {p.status.charAt(0).toUpperCase() + p.status.slice(1)} ({formatDate(p.expiryDate)})</option>
                            ))}
                        </select>
                    </div>
                    <div><label className="label">Claim Number *</label><input className="input" required value={form.claimNumber} onChange={(e) => setForm({ ...form, claimNumber: e.target.value })} /></div>
                    <div><label className="label">Claim Amount *</label><input type="number" className="input" required value={form.claimAmount} onChange={(e) => setForm({ ...form, claimAmount: e.target.value })} /></div>
                    <div><label className="label">Claim Date *</label><input type="date" className="input" required value={form.claimDate} onChange={(e) => setForm({ ...form, claimDate: e.target.value })} /></div>
                    <div><label className="label">Reason</label><textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">File Claim</button>
                    </div>
                </form>
            </Modal>

            <button onClick={openCreate} className="fab lg:hidden"><HiOutlinePlus className="w-6 h-6" /></button>
        </div>
    );
};

export default Claims;
