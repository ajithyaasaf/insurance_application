import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineUsers } from 'react-icons/hi';

const Dealers: React.FC = () => {
    const [dealers, setDealers] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', phone: '', address: '' });

    const fetchDealers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/dealers', { params: { page, limit: 20, search: search || undefined } });
            setDealers(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch dealers'); } finally { setLoading(false); }
    }, [search]);

    useEffect(() => { fetchDealers(); }, [fetchDealers]);

    const openCreate = () => { setEditing(null); setForm({ name: '', phone: '', address: '' }); setModalOpen(true); };

    const openEdit = (d: any) => {
        setEditing(d);
        setForm({ name: d.name, phone: d.phone || '', address: d.address || '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                const response = await api.put(`/dealers/${editing.id}`, form);
                toast.success(response.data?.message || 'Dealer updated');
            } else {
                const response = await api.post('/dealers', form);
                toast.success(response.data?.message || 'Dealer created', { duration: 5000 });
            }
            setModalOpen(false);
            fetchDealers(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error saving dealer'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this dealer?')) return;
        try { 
            await api.delete(`/dealers/${id}`); 
            toast.success('Dealer deleted'); 
            fetchDealers(meta.page); 
        } catch (err: any) { 
            toast.error(err.response?.data?.message || 'Failed to delete dealer'); 
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dealers</h1>
                    <p className="text-sm text-surface-500 mt-1">Manage sub-agents and lead referrers</p>
                </div>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> Add Dealer</button>
            </div>

            <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input className="input pl-10" placeholder="Search dealers by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : dealers.length === 0 ? (
                <EmptyState message="No dealers found" icon={<HiOutlineUsers className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="table-container hidden sm:block">
                        <table className="table">
                            <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Referred Policies</th><th>Created Date</th><th>Actions</th></tr></thead>
                            <tbody>
                                {dealers.map((d) => (
                                    <tr key={d.id}>
                                        <td className="font-medium text-surface-900">{d.name}</td>
                                        <td>{d.phone || '—'}</td>
                                        <td className="max-w-[200px] truncate" title={d.address}>{d.address || '—'}</td>
                                        <td><span className="badge-info">{d._count?.policies || 0}</span></td>
                                        <td className="text-surface-500 text-xs">{formatDate(d.createdAt)}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(d)} className="btn-ghost btn-sm"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(d.id)} className="btn-ghost btn-sm text-red-500"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="sm:hidden space-y-3">
                        {dealers.map((d) => (
                            <div key={d.id} className="card card-body">
                                <p className="font-semibold text-surface-900">{d.name}</p>
                                <p className="text-xs text-surface-500">{d.phone || 'No phone'}</p>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => openEdit(d)} className="btn-secondary btn-sm flex-1">Edit</button>
                                    <button onClick={() => handleDelete(d.id)} className="btn-danger btn-sm">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchDealers(p)} />
                </>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Dealer' : 'New Dealer'} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Dealers;
