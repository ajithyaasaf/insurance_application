import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { formatDate, getStatusColor } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlinePhone, HiOutlineSearch } from 'react-icons/hi';

const statusOptions = ['pending', 'completed', 'cancelled'];

const FollowUps: React.FC = () => {
    const [followUps, setFollowUps] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ customerId: '', policyId: '', nextFollowUpDate: '', notes: '', status: 'pending' });

    const fetchFollowUps = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/follow-ups', {
                params: {
                    page,
                    limit: 20,
                    search: search || undefined,
                    status: statusFilter || undefined,
                    date: dateFilter || undefined,
                },
            });
            setFollowUps(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch follow-ups'); } finally { setLoading(false); }
    }, [search, statusFilter, dateFilter]);

    useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

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
        setForm({ customerId: '', policyId: '', nextFollowUpDate: new Date().toISOString().split('T')[0], notes: '', status: 'pending' });
        setModalOpen(true);
    };

    const openEdit = (f: any) => {
        setEditing(f);
        setForm({
            customerId: f.customerId, policyId: f.policyId || '', nextFollowUpDate: f.nextFollowUpDate.split('T')[0],
            notes: f.notes || '', status: f.status,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...form, policyId: form.policyId || undefined };
            if (editing) { await api.put(`/follow-ups/${editing.id}`, payload); toast.success('Follow-up updated'); }
            else { await api.post('/follow-ups', payload); toast.success('Follow-up created'); }
            setModalOpen(false); fetchFollowUps(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this follow-up?')) return;
        try { await api.delete(`/follow-ups/${id}`); toast.success('Deleted'); fetchFollowUps(meta.page); } catch { toast.error('Failed'); }
    };

    const markComplete = async (id: string) => {
        try { await api.put(`/follow-ups/${id}`, { status: 'completed' }); toast.success('Marked complete'); fetchFollowUps(meta.page); } catch { toast.error('Failed'); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Follow-ups</h1>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> Add Follow-up</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input className="input pl-10" placeholder="Search by customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <input type="date" className="input sm:w-44" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                <select className="select sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                {(search || dateFilter || statusFilter) && (
                    <button onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter(''); }} className="btn-ghost btn-sm self-start">Clear</button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : followUps.length === 0 ? (
                <EmptyState message="No follow-ups found" icon={<HiOutlinePhone className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="hidden sm:block space-y-3">
                        {followUps.map((f) => (
                            <div key={f.id} className="card card-body flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-surface-900">{f.customer?.name}</p>
                                        <span className={getStatusColor(f.status)}>{f.status}</span>
                                    </div>
                                    <p className="text-xs text-surface-500">{formatDate(f.nextFollowUpDate)} • {f.policy?.productName || f.policy?.policyType || 'No policy linked'}{f.policy?.vehicleNumber && ` (${f.policy.vehicleNumber})`}</p>
                                    {f.notes && <p className="text-sm text-surface-600 mt-1">{f.notes}</p>}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {f.status === 'pending' && <button onClick={() => markComplete(f.id)} className="btn-primary btn-sm">Complete</button>}
                                    <button onClick={() => openEdit(f)} className="btn-ghost btn-sm"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDelete(f.id)} className="btn-ghost btn-sm text-red-500"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sm:hidden space-y-3">
                        {followUps.map((f) => (
                            <div key={f.id} className="card card-body">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-semibold text-surface-900">{f.customer?.name}</p>
                                    <span className={getStatusColor(f.status)}>{f.status}</span>
                                </div>
                                <p className="text-xs text-surface-500 mb-1">{formatDate(f.nextFollowUpDate)}</p>
                                {f.notes && <p className="text-sm text-surface-600 mb-2">{f.notes}</p>}
                                <div className="flex gap-2">
                                    {f.status === 'pending' && <button onClick={() => markComplete(f.id)} className="btn-primary btn-sm flex-1">Complete</button>}
                                    <button onClick={() => openEdit(f)} className="btn-secondary btn-sm flex-1">Edit</button>
                                    <button onClick={() => handleDelete(f.id)} className="btn-danger btn-sm">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchFollowUps(p)} />
                </>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Follow-up' : 'New Follow-up'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="label">Customer *</label>
                        <select className="select" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                            <option value="">Select</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div><label className="label">Policy (Optional)</label>
                        <select className="select" value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })}>
                            <option value="">None</option>
                            {policies.filter(p => !form.customerId || p.customerId === form.customerId).map(p => (
                                <option key={p.id} value={p.id}>{p.productName || p.policyType} {p.vehicleNumber && `(${p.vehicleNumber})`} - {p.customer?.name}</option>
                            ))}
                        </select>
                    </div>
                    <div><label className="label">Follow-up Date *</label><input type="date" className="input" required value={form.nextFollowUpDate} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} /></div>
                    <div><label className="label">Status</label>
                        <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                    <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            <button onClick={openCreate} className="fab lg:hidden"><HiOutlinePlus className="w-6 h-6" /></button>
        </div>
    );
};

export default FollowUps;
