import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import SearchableSelect from '../components/ui/SearchableSelect';
import { formatDate, formatCurrency, getStatusColor } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineShieldCheck, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { CLAIM_STATUSES as claimStatusOptions } from '../utils/constants';



const initialForm = {
    customerId: '', policyId: '', claimNumber: '', claimAmount: '', claimDate: '', status: 'filed', reason: '',
};

const Claims: React.FC = () => {
    const [claims, setClaims] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState(initialForm);

    const fetchClaims = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/claims', {
                params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined },
            });
            setClaims(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch claims'); } finally { setLoading(false); }
    }, [search, statusFilter]);

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
        setEditing(null);
        setForm({ ...initialForm, claimDate: new Date().toISOString().split('T')[0] });
        setModalOpen(true);
    };

    const openEdit = (claim: any) => {
        setEditing(claim);
        setForm({
            customerId: claim.customerId,
            policyId: claim.policyId,
            claimNumber: claim.claimNumber || '',
            claimAmount: String(claim.claimAmount),
            claimDate: claim.claimDate?.split('T')[0] || '',
            status: claim.status,
            reason: claim.reason || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...form, claimAmount: parseFloat(form.claimAmount) };
        try {
            if (editing) {
                await api.put(`/claims/${editing.id}`, payload);
                toast.success('Claim updated');
            } else {
                await api.post('/claims', payload);
                toast.success('Claim filed');
            }
            setModalOpen(false);
            fetchClaims(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this claim? This action cannot be undone.')) return;
        try {
            await api.delete(`/claims/${id}`);
            toast.success('Claim deleted');
            fetchClaims(meta.page);
        } catch { toast.error('Failed to delete claim'); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Claims</h1>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> File Claim</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input className="input pl-10" placeholder="Search by customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <SearchableSelect
                    className="w-full sm:w-44"
                    options={claimStatusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allLabel="All Status"
                    placeholder="Search status..."
                />
                {(search || statusFilter) && (
                    <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="btn-ghost btn-sm self-start sm:self-auto">
                        Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : claims.length === 0 ? (
                <EmptyState message="No claims found" icon={<HiOutlineShieldCheck className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="table-container hidden sm:block">
                        <table className="table">
                            <thead><tr><th>Customer</th><th>Policy</th><th>Claim #</th><th>Amount</th><th>Date</th><th>Status</th><th>Reason</th><th></th></tr></thead>
                            <tbody>
                                {claims.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-medium text-surface-900">{c.customer?.name}</td>
                                        <td className="text-xs">{c.policy?.productName || c.policy?.policyType} {c.policy?.vehicleNumber && `(${c.policy.vehicleNumber})`}</td>
                                        <td className="text-xs">{c.claimNumber || '—'}</td>
                                        <td className="font-medium">{formatCurrency(c.claimAmount)}</td>
                                        <td className="text-xs">{formatDate(c.claimDate)}</td>
                                        <td><span className={getStatusColor(c.status)}>{c.status}</span></td>
                                        <td className="text-xs text-surface-500 max-w-[150px] truncate">{c.reason || '—'}</td>
                                        <td>
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => openEdit(c)} className="btn-ghost btn-sm p-1" title="Edit"><HiOutlinePencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(c.id)} className="btn-ghost btn-sm p-1 text-red-500 hover:text-red-700" title="Delete"><HiOutlineTrash className="w-4 h-4" /></button>
                                            </div>
                                        </td>
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
                                        <p className="text-xs text-surface-500">{c.policy?.productName || c.policy?.policyType} {c.policy?.vehicleNumber && `(${c.policy.vehicleNumber})`}</p>
                                    </div>
                                    <span className={getStatusColor(c.status)}>{c.status}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>{formatCurrency(c.claimAmount)}</span>
                                    <span className="text-xs text-surface-500">{formatDate(c.claimDate)}</span>
                                </div>
                                {c.reason && <p className="text-xs text-surface-500 mt-1">{c.reason}</p>}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-surface-100">
                                    <button onClick={() => openEdit(c)} className="btn-secondary btn-sm flex-1">Edit</button>
                                    <button onClick={() => handleDelete(c.id)} className="btn-sm flex-1 text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchClaims(p)} />
                </>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Claim' : 'File New Claim'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="label">Customer *</label>
                        <SearchableSelect
                            required
                            disabled={!!editing}
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={form.customerId}
                            onChange={(val) => setForm({ ...form, customerId: val })}
                            placeholder="Select Customer"
                        />
                    </div>
                    <div><label className="label">Policy *</label>
                        <SearchableSelect
                            required
                            disabled={!!editing}
                            options={policies.filter(p => !form.customerId || p.customerId === form.customerId).map(p => ({
                                value: p.id,
                                label: `${p.productName || p.policyType} ${p.vehicleNumber ? `(${p.vehicleNumber})` : ''} - ${p.customer?.name}`
                            }))}
                            value={form.policyId}
                            onChange={(val) => setForm({ ...form, policyId: val })}
                            placeholder="Select Policy"
                        />
                    </div>
                    <div><label className="label">Claim Number</label><input className="input" value={form.claimNumber} onChange={(e) => setForm({ ...form, claimNumber: e.target.value })} /></div>
                    <div><label className="label">Claim Amount *</label><input type="number" min="0" step="0.01" className="input" required value={form.claimAmount} onChange={(e) => setForm({ ...form, claimAmount: e.target.value })} /></div>
                    <div><label className="label">Claim Date *</label><input type="date" className="input" required value={form.claimDate} onChange={(e) => setForm({ ...form, claimDate: e.target.value })} /></div>
                    <div><label className="label">Status *</label>
                        <SearchableSelect
                            required
                            options={claimStatusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                            value={form.status}
                            onChange={(val) => setForm({ ...form, status: val })}
                            placeholder="Select Status"
                        />
                    </div>
                    <div><label className="label">Reason / Notes</label><textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Save Changes' : 'File Claim'}</button>
                    </div>
                </form>
            </Modal>

            <button onClick={openCreate} className="fab lg:hidden"><HiOutlinePlus className="w-6 h-6" /></button>
        </div>
    );
};

export default Claims;
