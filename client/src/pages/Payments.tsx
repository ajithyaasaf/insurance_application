import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import SearchableSelect from '../components/ui/SearchableSelect';
import { formatDate, formatCurrency, getStatusColor } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineCreditCard } from 'react-icons/hi';
import { PAYMENT_STATUSES as statusOptions } from '../utils/constants';



const Payments: React.FC = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({
        customerId: '', policyId: '', amount: '', dueDate: '', paidDate: '', paidAmount: '', status: 'pending', notes: '',
    });

    const fetchPayments = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/payments', {
                params: {
                    page,
                    limit: 20,
                    status: statusFilter || undefined,
                    search: search || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                },
            });
            setPayments(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch payments'); } finally { setLoading(false); }
    }, [search, statusFilter, dateFrom, dateTo]);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);

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
        setForm({ customerId: '', policyId: '', amount: '', dueDate: '', paidDate: '', paidAmount: '', status: 'pending', notes: '' });
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({
            customerId: p.customerId, policyId: p.policyId, amount: p.amount.toString(), dueDate: p.dueDate.split('T')[0],
            paidDate: p.paidDate?.split('T')[0] || '', paidAmount: p.paidAmount?.toString() || '', status: p.status, notes: p.notes || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...form, amount: parseFloat(form.amount), paidAmount: form.paidAmount ? parseFloat(form.paidAmount) : undefined,
                paidDate: form.paidDate || undefined, notes: form.notes || undefined,
            };
            if (editing) { 
                const res = await api.put(`/payments/${editing.id}`, payload); 
                toast.success(res.data.message || 'Payment updated'); 
            }
            else { 
                const res = await api.post('/payments', payload); 
                toast.success(res.data.message || 'Payment created'); 
            }
            setModalOpen(false); fetchPayments(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDetectOverdue = async () => {
        try {
            const res = await api.post('/payments/detect-overdue');
            toast.success(res.data.message);
            fetchPayments(meta.page);
        } catch { toast.error('Failed'); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Payments</h1>
                <div className="flex gap-2">
                    <button onClick={handleDetectOverdue} className="btn-secondary text-amber-600">Detect Overdue</button>
                    <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> Add Payment</button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input className="input pl-10" placeholder="Search by customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <SearchableSelect
                    className="w-full sm:w-40"
                    options={[
                        ...statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
                        { value: 'overdue', label: 'Overdue' }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allLabel="All Status"
                    placeholder="Search status..."
                />
                <div className="flex items-center gap-2">
                    <label className="text-xs text-surface-500 whitespace-nowrap">Due From</label>
                    <input type="date" className="input sm:w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-surface-500 whitespace-nowrap">To</label>
                    <input type="date" className="input sm:w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                {(search || statusFilter || dateFrom || dateTo) && (
                    <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }} className="btn-ghost btn-sm self-start sm:self-auto">
                        Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : payments.length === 0 ? (
                <EmptyState message="No payments found" icon={<HiOutlineCreditCard className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="table-container hidden sm:block">
                        <table className="table">
                            <thead><tr><th>Customer</th><th>Policy</th><th>Amount</th><th>Due Date</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-medium text-surface-900">{p.customer?.name}</td>
                                        <td className="text-xs">{p.policy?.productName || p.policy?.policyType || '—'} {p.policy?.vehicleNumber && `(${p.policy.vehicleNumber})`}</td>
                                        <td className="font-medium">{formatCurrency(p.amount)}</td>
                                        <td className="text-xs">{formatDate(p.dueDate)}</td>
                                        <td className="text-xs">{p.paidAmount ? formatCurrency(p.paidAmount) : '—'}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className={getStatusColor(p.status)}>{p.status}</span>
                                                {p.isOverdue && (
                                                    <span className="badge-danger">overdue</span>
                                                )}
                                            </div>
                                        </td>
                                        <td><button onClick={() => openEdit(p)} className="btn-ghost btn-sm"><HiOutlinePencil className="w-3.5 h-3.5" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="sm:hidden space-y-3">
                        {payments.map((p) => (
                            <div key={p.id} className="card card-body" onClick={() => openEdit(p)}>
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-surface-900">{p.customer?.name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={getStatusColor(p.status)}>{p.status}</span>
                                        {p.isOverdue && (
                                            <span className="badge-danger">overdue</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-surface-500 mb-2">Due: {formatDate(p.dueDate)}</p>
                                <div className="flex justify-between text-sm">
                                    <span>Amount: <strong>{formatCurrency(p.amount)}</strong></span>
                                    {p.paidAmount && <span className="text-emerald-600">Paid: {formatCurrency(p.paidAmount)}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchPayments(p)} />
                </>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Update Payment' : 'New Payment'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editing && (
                        <>
                            <div><label className="label">Customer *</label>
                                <SearchableSelect
                                    required
                                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                                    value={form.customerId}
                                    onChange={(val) => setForm({ ...form, customerId: val })}
                                    placeholder="Select Customer"
                                />
                            </div>
                            <div><label className="label">Policy *</label>
                                <SearchableSelect
                                    required
                                    options={policies.filter(p => !form.customerId || p.customerId === form.customerId).map(p => ({
                                        value: p.id,
                                        label: `${p.productName || p.policyType} ${p.vehicleNumber ? `(${p.vehicleNumber})` : ''} - ${p.customer?.name}`
                                    }))}
                                    value={form.policyId}
                                    onChange={(val) => setForm({ ...form, policyId: val })}
                                    placeholder="Select Policy"
                                />
                            </div>
                        </>
                    )}
                    <div><label className="label">Amount *</label><input type="number" min="0" step="0.01" className="input" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                    <div><label className="label">Due Date *</label><input type="date" className="input" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                    <div><label className="label">Paid Date</label><input type="date" className="input" value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} /></div>
                    <div><label className="label">Paid Amount</label><input type="number" min="0" step="0.01" className="input" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="Partial or full" /></div>
                    <div><label className="label">Status</label>
                        <SearchableSelect
                            required
                            options={statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                            value={form.status}
                            onChange={(val) => setForm({ ...form, status: val })}
                            placeholder="Select Status"
                        />
                    </div>
                    <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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

export default Payments;
