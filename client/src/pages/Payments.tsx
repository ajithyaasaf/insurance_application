import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import SearchableSelect from '../components/ui/SearchableSelect';
import { formatDate, formatCurrency, getStatusColor, scrollToFirstError } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineCreditCard } from 'react-icons/hi';
import { PAYMENT_STATUSES as statusOptions } from '../utils/constants';



const Payments: React.FC = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [dealers, setDealers] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dealerFilter, setDealerFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({
        customerId: '', policyId: '', amount: '', dueDate: '', paidDate: '', paidAmount: '', status: 'pending', notes: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

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
                    dealerId: dealerFilter || undefined,
                },
            });
            setPayments(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch payments'); } finally { setLoading(false); }
    }, [search, statusFilter, dateFrom, dateTo, dealerFilter]);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);

    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                const [custRes, polRes, dlrRes] = await Promise.all([
                    api.get('/customers?limit=100'),
                    api.get('/policies?limit=100'),
                    api.get('/dealers?limit=100')
                ]);
                setCustomers(custRes.data.data);
                setPolicies(polRes.data.data);
                setDealers(dlrRes.data.data || []);
            } catch { }
        };
        loadDropdowns();
    }, []);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.customerId) errs.customerId = 'Please select a customer';
        if (!form.policyId) errs.policyId = 'Please select a policy';
        if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Valid amount is required';
        if (!form.dueDate) errs.dueDate = 'Due date is required';
        if (!form.status) errs.status = 'Please select a status';
        return errs;
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ customerId: '', policyId: '', amount: '', dueDate: '', paidDate: '', paidAmount: '', status: 'pending', notes: '' });
        setErrors({});
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({
            customerId: p.customerId, policyId: p.policyId, amount: p.amount.toString(), dueDate: p.dueDate.split('T')[0],
            paidDate: p.paidDate?.split('T')[0] || '', paidAmount: p.paidAmount?.toString() || '', status: p.status, notes: p.notes || '',
        });
        setErrors({});
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            scrollToFirstError();
            return;
        }
        setErrors({});
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
                <SearchableSelect
                    className="w-full sm:w-48"
                    options={dealers.map(d => ({ value: d.id, label: d.name }))}
                    value={dealerFilter}
                    onChange={setDealerFilter}
                    allLabel="All Dealers"
                    placeholder="Search dealer..."
                />
                <div className="flex items-center gap-2">
                    <label className="text-xs text-surface-500 whitespace-nowrap">Due From</label>
                    <input type="date" className="input sm:w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-surface-500 whitespace-nowrap">To</label>
                    <input type="date" className="input sm:w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                {(search || statusFilter || dealerFilter || dateFrom || dateTo) && (
                    <button onClick={() => { setSearch(''); setStatusFilter(''); setDealerFilter(''); setDateFrom(''); setDateTo(''); }} className="btn-ghost btn-sm self-start sm:self-auto">
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
                            <thead><tr><th>Customer</th><th>Policy</th><th>Amount</th><th>Due Date</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {payments.map((p) => {
                                    const outstanding = p.amount - (p.paidAmount || 0);
                                    return (
                                        <tr key={p.id}>
                                            <td className="font-medium text-surface-900">{p.customer?.name}</td>
                                            <td className="text-xs">{p.policy?.productName || p.policy?.policyType || '—'} {p.policy?.vehicleNumber && `(${p.policy.vehicleNumber})`}</td>
                                            <td className="font-medium">{formatCurrency(p.amount)}</td>
                                            <td className="text-xs">{formatDate(p.dueDate)}</td>
                                            <td className="text-xs">{p.paidAmount ? formatCurrency(p.paidAmount) : '—'}</td>
                                            <td className={`font-bold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {formatCurrency(outstanding)}
                                            </td>
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
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-surface-50 font-bold">
                                <tr>
                                    <td colSpan={5} className="text-right py-3">Total Outstanding (This Page):</td>
                                    <td className="text-red-600 py-3">
                                        {formatCurrency(payments.reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0))}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="sm:hidden space-y-3">
                        {payments.map((p) => {
                            const outstanding = p.amount - (p.paidAmount || 0);
                            return (
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
                                    {outstanding > 0 && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-surface-200 flex justify-between items-center text-sm">
                                            <span className="text-surface-500">Outstanding:</span>
                                            <span className="font-bold text-red-600">{formatCurrency(outstanding)}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="card card-body bg-red-50 border-red-100">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-red-800">Total Outstanding (Page)</span>
                                <span className="text-lg font-bold text-red-600">
                                    {formatCurrency(payments.reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0))}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchPayments(p)} />
                </>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Update Payment' : 'New Payment'}>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {!editing && (
                        <>
                            <div>
                                <label className="label">Customer *</label>
                                <SearchableSelect
                                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                                    value={form.customerId}
                                    onChange={(val) => { setForm({ ...form, customerId: val }); setErrors(prev => ({ ...prev, customerId: '' })); }}
                                    placeholder="Select Customer"
                                />
                                {errors.customerId && <p className="text-xs text-red-500 mt-1">{errors.customerId}</p>}
                            </div>
                            <div>
                                <label className="label">Policy *</label>
                                <SearchableSelect
                                    options={policies.filter(p => !form.customerId || p.customerId === form.customerId).map(p => ({
                                        value: p.id,
                                        label: `${p.productName || p.policyType} ${p.vehicleNumber ? `(${p.vehicleNumber})` : ''} - ${p.customer?.name}`
                                    }))}
                                    value={form.policyId}
                                    onChange={(val) => { setForm({ ...form, policyId: val }); setErrors(prev => ({ ...prev, policyId: '' })); }}
                                    placeholder="Select Policy"
                                />
                                {errors.policyId && <p className="text-xs text-red-500 mt-1">{errors.policyId}</p>}
                            </div>
                        </>
                    )}
                    <div>
                        <label className="label">Amount *</label>
                        <input
                            type="number" min="0" step="0.01"
                            className={`input ${errors.amount ? 'border-red-500 focus:ring-red-400' : ''}`}
                            data-error-field={errors.amount ? 'true' : undefined}
                            value={form.amount}
                            onChange={(e) => { setForm({ ...form, amount: e.target.value }); setErrors(prev => ({ ...prev, amount: '' })); }}
                        />
                        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                    </div>
                    <div>
                        <label className="label">Due Date *</label>
                        <input
                            type="date"
                            className={`input ${errors.dueDate ? 'border-red-500 focus:ring-red-400' : ''}`}
                            data-error-field={errors.dueDate ? 'true' : undefined}
                            value={form.dueDate}
                            onChange={(e) => { setForm({ ...form, dueDate: e.target.value }); setErrors(prev => ({ ...prev, dueDate: '' })); }}
                        />
                        {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
                    </div>
                    <div><label className="label">Paid Date</label><input type="date" className="input" value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} /></div>
                    <div><label className="label">Paid Amount</label><input type="number" min="0" step="0.01" className="input" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="Partial or full" /></div>
                    <div>
                        <label className="label">Status *</label>
                        <SearchableSelect
                            options={statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                            value={form.status}
                            onChange={(val) => { setForm({ ...form, status: val }); setErrors(prev => ({ ...prev, status: '' })); }}
                            placeholder="Select Status"
                        />
                        {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
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
