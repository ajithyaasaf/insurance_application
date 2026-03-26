import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineUsers, HiOutlineEye } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

    const fetchCustomers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/customers', { params: { page, limit: 20, search: search || undefined } });
            setCustomers(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch customers'); } finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const openCreate = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '' }); setModalOpen(true); };

    const openEdit = (c: any) => {
        setEditing(c);
        setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
        setModalOpen(true);
    };

    const viewDetail = async (id: string) => {
        try {
            const res = await api.get(`/customers/${id}`);
            setDetail(res.data.data);
            setDetailOpen(true);
        } catch { toast.error('Failed to load details'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/customers/${editing.id}`, form);
                toast.success('Customer updated');
            } else {
                await api.post('/customers', form);
                toast.success('Customer created');
            }
            setModalOpen(false);
            fetchCustomers(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this customer?')) return;
        try { await api.delete(`/customers/${id}`); toast.success('Customer deleted'); fetchCustomers(meta.page); } catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Customers</h1>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> Add Customer</button>
            </div>

            <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-10" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : customers.length === 0 ? (
                <EmptyState message="No customers found" icon={<HiOutlineUsers className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="table-container hidden sm:block">
                        <table className="table">
                            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Policies</th><th>Created</th><th>Actions</th></tr></thead>
                            <tbody>
                                {customers.map((c) => (
                                    <tr key={c.id}>
                                        <td className="font-medium text-surface-900">{c.name}</td>
                                        <td>{c.phone || '—'}</td>
                                        <td>{c.email || '—'}</td>
                                        <td><span className="badge-info">{c._count?.policies || 0}</span></td>
                                        <td className="text-surface-500 text-xs">{formatDate(c.createdAt)}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => viewDetail(c.id)} className="btn-ghost btn-sm"><HiOutlineEye className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => openEdit(c)} className="btn-ghost btn-sm"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(c.id)} className="btn-ghost btn-sm text-red-500"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="sm:hidden space-y-3">
                        {customers.map((c) => (
                            <div key={c.id} className="card card-body" onClick={() => viewDetail(c.id)}>
                                <p className="font-semibold text-surface-900">{c.name}</p>
                                <p className="text-xs text-surface-500">{c.phone || 'No phone'} • {c.email || 'No email'}</p>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="btn-secondary btn-sm flex-1">Edit</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="btn-danger btn-sm">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchCustomers(p)} />
                </>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Customer' : 'New Customer'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Customer Details" size="lg">
                {detail && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-surface-500">Name</p><p className="font-medium">{detail.name}</p></div>
                            <div><p className="text-xs text-surface-500">Phone</p><p className="font-medium">{detail.phone || '—'}</p></div>
                            <div><p className="text-xs text-surface-500">Email</p><p className="font-medium">{detail.email || '—'}</p></div>
                            <div><p className="text-xs text-surface-500">Address</p><p className="font-medium">{detail.address || '—'}</p></div>
                        </div>
                        {detail.policies?.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Policies ({detail.policies.length})</h4>
                                <div className="space-y-2">
                                    {detail.policies.map((p: any) => (
                                        <div key={p.id} className="p-3 bg-surface-50 rounded-xl text-sm">
                                            <div className="flex justify-between"><span className="font-medium">{p.productName || p.policyType}</span><span className={`${p.status === 'active' ? 'text-emerald-600' : 'text-surface-500'} text-xs`}>{p.status}</span></div>
                                            <p className="text-xs text-surface-500">{formatDate(p.startDate)} → {formatDate(p.expiryDate)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <button onClick={openCreate} className="fab lg:hidden"><HiOutlinePlus className="w-6 h-6" /></button>
        </div>
    );
};

export default Customers;
