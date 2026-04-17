import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import SearchableSelect from '../components/ui/SearchableSelect';
import PolicyFormFields from '../components/ui/PolicyFormFields';
import { formatDate, formatCurrency, getStatusColor, daysUntil, formatRelativeDate } from '../utils/format';
import { POLICY_TYPES as policyTypes, PREMIUM_MODES as premiumModes, POLICY_STATUSES as statusOptions, EDITABLE_POLICY_STATUSES, VEHICLE_CLASSES } from '../utils/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineDocumentText, HiOutlineRefresh, HiOutlineEye } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';



const Policies: React.FC = () => {
    const navigate = useNavigate();
    const [policies, setPolicies] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [dealers, setDealers] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [renewModalOpen, setRenewModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [renewingPolicy, setRenewingPolicy] = useState<any>(null);
    const [form, setForm] = useState({
        customerId: '', companyId: '', policyNumber: '', policyType: 'motor', vehicleNumber: '', startDate: '', expiryDate: '',
        sumInsured: '', premiumAmount: '', premiumMode: 'yearly', productName: '', noOfYears: '1',
        make: '', model: '', vehicleClass: '', idv: '', od: '', tp: '', tax: '', totalPremium: '', paymentMethod: '', paidAmount: '', dealerId: '',
        registrationDate: ''
    });
    // For edit modal only: tracks the manually-selectable status ('active' | 'cancelled')
    const [editStatus, setEditStatus] = useState<'active' | 'cancelled'>('active');
    const [renewForm, setRenewForm] = useState({ startDate: '', expiryDate: '', premiumAmount: '', policyNumber: '', paidAmount: '' });
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; counts: { paymentsCount: number; claimsCount: number; followUpsCount: number } } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchPolicies = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/policies', { params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined, policyType: typeFilter || undefined, companyId: companyFilter || undefined } });
            setPolicies(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch policies'); } finally { setLoading(false); }
    }, [search, statusFilter, typeFilter, companyFilter]);

    useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

    useEffect(() => {
        const loadDropdowns = async () => {
            try {
                const [custRes, compRes, dealerRes] = await Promise.all([api.get('/customers?limit=100'), api.get('/companies'), api.get('/dealers?limit=100')]);
                setCustomers(custRes.data.data);
                setCompanies(compRes.data.data);
                setDealers(dealerRes.data.data);
            } catch { }
        };
        loadDropdowns();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ customerId: '', companyId: '', policyNumber: '', policyType: 'motor', vehicleNumber: '', startDate: '', expiryDate: '', sumInsured: '', premiumAmount: '', premiumMode: 'yearly', productName: '', noOfYears: '1', make: '', model: '', vehicleClass: '', idv: '', od: '', tp: '', tax: '', totalPremium: '', paymentMethod: '', paidAmount: '', dealerId: '', registrationDate: '' });
        setEditStatus('active');
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({
            customerId: p.customerId, companyId: p.companyId, policyNumber: p.policyNumber || '', policyType: p.policyType,
            vehicleNumber: p.vehicleNumber || '', startDate: p.startDate.split('T')[0], expiryDate: p.expiryDate.split('T')[0],
            sumInsured: p.sumInsured?.toString() || '', premiumAmount: p.premiumAmount.toString(), premiumMode: p.premiumMode,
            productName: p.productName || '', noOfYears: p.noOfYears.toString(),
            make: p.make || '', model: p.model || '', vehicleClass: p.vehicleClass || '', idv: p.idv?.toString() || '',
            od: p.od?.toString() || '', tp: p.tp?.toString() || '', tax: p.tax?.toString() || '', totalPremium: p.totalPremium?.toString() || '',
            paymentMethod: p.paymentMethod || '', paidAmount: '', dealerId: p.dealerId || '',
            registrationDate: p.registrationDate || ''
        });
        // Pre-fill editStatus from existing policy — only valid manual values
        setEditStatus((p.status === 'cancelled' ? 'cancelled' : 'active') as 'active' | 'cancelled');
        setModalOpen(true);
    };

    const handleTypeChange = (val: string) => {
        setForm(prev => ({
            ...prev,
            policyType: val,
            // Reset motor specific fields if switching away from motor
            ...(val !== 'motor' ? {
                vehicleNumber: '', make: '', model: '', vehicleClass: '',
                idv: '', od: '', tp: '', tax: '', totalPremium: '', dealerId: '',
                registrationDate: ''
            } : {
                // Clear fields not needed for motor
                productName: '',
                sumInsured: ''
            })
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                sumInsured: form.policyType === 'motor' ? undefined : (form.sumInsured ? parseFloat(form.sumInsured) : undefined),
                premiumAmount: parseFloat(form.premiumAmount),
                noOfYears: parseInt(form.noOfYears),
                // Ensure productName is excluded for motor
                productName: form.policyType === 'motor' ? undefined : (form.productName || undefined),
                idv: form.idv ? parseFloat(form.idv) : undefined,
                od: form.od ? parseFloat(form.od) : undefined,
                tp: form.tp ? parseFloat(form.tp) : undefined,
                tax: form.tax ? parseFloat(form.tax) : undefined,
                // Auto-sync: if totalPremium was not manually computed from OD/TP/Tax,
                // mirror it from premiumAmount so backend data is always consistent.
                totalPremium: form.totalPremium ? parseFloat(form.totalPremium) : (form.premiumAmount ? parseFloat(form.premiumAmount) : undefined),
                make: form.make || undefined,
                model: form.model || undefined,
                vehicleClass: form.vehicleClass || undefined,
                registrationDate: form.registrationDate || undefined,
                paymentMethod: form.paymentMethod || undefined,
                paidAmount: form.paidAmount ? parseFloat(form.paidAmount) : undefined,
                dealerId: form.dealerId || undefined,
                // Status: only included in edit payloads; create always defaults to 'active' on the server
                ...(editing ? { status: editStatus } : {}),
            };
            if (editing) { await api.put(`/policies/${editing.id}`, payload); toast.success('Policy updated'); }
            else { await api.post('/policies', payload); toast.success('Policy created'); }
            setModalOpen(false); fetchPolicies(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: string, customerName: string) => {
        // Step 1: Fetch linked record counts before asking for confirmation
        try {
            const res = await api.get(`/policies/${id}/pre-delete-check`);
            setDeleteConfirm({ id, name: customerName, counts: res.data.data });
        } catch { toast.error('Could not verify policy dependencies'); }
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/policies/${deleteConfirm.id}`);
            toast.success('Policy and all linked records deleted');
            setDeleteConfirm(null);
            fetchPolicies(meta.page);
        } catch { toast.error('Failed to delete'); }
        finally { setDeleteLoading(false); }
    };

    const openRenew = (p: any) => {
        setRenewingPolicy(p);
        const expiry = new Date(p.expiryDate);
        const newExpiry = new Date(expiry);
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        setRenewForm({
            startDate: expiry.toISOString().split('T')[0],
            expiryDate: newExpiry.toISOString().split('T')[0],
            premiumAmount: p.premiumAmount.toString(),
            policyNumber: '',
            paidAmount: '',
        });
        setRenewModalOpen(true);
    };

    const handleRenew = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/policies/${renewingPolicy.id}/renew`, {
                ...renewForm, 
                premiumAmount: parseFloat(renewForm.premiumAmount),
                paidAmount: renewForm.paidAmount ? parseFloat(renewForm.paidAmount) : undefined,
            });
            toast.success('Policy renewed!');
            setRenewModalOpen(false); fetchPolicies(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const needsVehicle = form.policyType === 'motor';

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Policies</h1>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> Add Policy</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input className="input pl-10" placeholder="Search by customer, policy no, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <SearchableSelect
                    className="w-full sm:w-48"
                    options={statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allLabel="All Status"
                    placeholder="Search status..."
                />
                <SearchableSelect
                    className="w-full sm:w-48"
                    options={policyTypes.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    allLabel="All Types"
                    placeholder="Search type..."
                />
                <SearchableSelect
                    className="w-full sm:w-48"
                    options={companies
                        .filter(c => {
                            if (!typeFilter) return true;
                            if (typeFilter === 'life') return c.name === 'LIC';
                            if (typeFilter === 'health') return ['Star Health Insurance', 'New India Assurance', 'Care Insurance'].includes(c.name);
                            if (typeFilter === 'motor') return !['Star Health Insurance', 'Care Insurance', 'LIC'].includes(c.name);
                            return true;
                        })
                        .map(c => ({ value: c.id, label: c.name }))
                    }
                    value={companyFilter}
                    onChange={setCompanyFilter}
                    allLabel="All Companies"
                    placeholder="Search company..."
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : policies.length === 0 ? (
                <EmptyState message="No policies found" icon={<HiOutlineDocumentText className="w-12 h-12" />} />
            ) : (
                <>
                    <div className="table-container hidden md:block">
                        <table className="table">
                            <thead><tr><th>Customer</th><th>Type</th><th>Company</th><th>Premium</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {policies.map((p) => (
                                    <tr key={p.id}>
                                        <td><p className="font-medium text-surface-900">{p.customer?.name}</p><p className="text-xs text-surface-500">{p.productName || p.policyNumber || ''}</p></td>
                                        <td className="capitalize">{p.policyType}</td>
                                        <td className="text-xs">{p.company?.name}</td>
                                        <td className="font-medium">{formatCurrency(p.premiumAmount)}</td>
                                        <td>
                                            <p className={`text-xs font-medium ${p.status === 'active' && daysUntil(p.expiryDate) <= 30 ? 'text-amber-600' : 'text-surface-600'}`}>
                                                {formatRelativeDate(p.expiryDate)}
                                            </p>
                                            <p className="text-xs text-surface-400">{formatDate(p.expiryDate)}</p>
                                        </td>
                                        <td><span className={getStatusColor(p.status)}>{p.status}</span></td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => navigate(`/policies/${p.id}`)} className="btn-ghost btn-sm text-primary-600" title="View"><HiOutlineEye className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => openEdit(p)} className="btn-ghost btn-sm"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                                                {p.status === 'active' && <button onClick={() => openRenew(p)} className="btn-ghost btn-sm text-emerald-600" title="Renew"><HiOutlineRefresh className="w-3.5 h-3.5" /></button>}
                                                <button onClick={() => handleDelete(p.id, p.customer?.name)} className="btn-ghost btn-sm text-red-500"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden space-y-3">
                        {policies.map((p) => (
                            <div key={p.id} className="card card-body">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-surface-900">{p.customer?.name}</p>
                                        <p className="text-xs text-surface-500 capitalize">{p.policyType} • {p.company?.name}</p>
                                    </div>
                                    <span className={getStatusColor(p.status)}>{p.status}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-3">
                                    <span className="text-surface-500">Premium: <strong className="text-surface-900">{formatCurrency(p.premiumAmount)}</strong></span>
                                    <span className={`text-xs ${daysUntil(p.expiryDate) <= 30 ? 'text-amber-600' : 'text-surface-500'}`}>{formatRelativeDate(p.expiryDate)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate(`/policies/${p.id}`)} className="btn-secondary btn-sm flex-1">View</button>
                                    <button onClick={() => openEdit(p)} className="btn-secondary btn-sm flex-1">Edit</button>
                                    {p.status === 'active' && <button onClick={() => openRenew(p)} className="btn-primary btn-sm flex-1">Renew</button>}
                                    <button onClick={() => handleDelete(p.id, p.customer?.name)} className="btn-danger btn-sm">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchPolicies(p)} />
                </>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Policy' : 'New Policy'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <PolicyFormFields 
                        form={form} 
                        setForm={setForm} 
                        companies={companies} 
                        dealers={dealers} 
                        customers={customers} 
                        isEditing={!!editing} 
                    />

                    {/* Status selection is still handled here as it's specific to the logic in this page */}
                    {editing && (
                        <div className="col-span-full border-t border-surface-200 pt-4 mt-4">
                            <label className="label">Policy Status</label>
                            <div className="flex gap-2">
                                {EDITABLE_POLICY_STATUSES.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setEditStatus(s as 'active' | 'cancelled')}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${editStatus === s
                                                ? s === 'cancelled'
                                                    ? 'bg-red-50 border-red-400 text-red-700'
                                                    : 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                                : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'
                                            }`}
                                    >
                                        {s === 'active' ? '✓ Active' : '✕ Cancelled'}
                                    </button>
                                ))}
                            </div>
                            {editStatus === 'cancelled' && (
                                <p className="text-xs text-red-500 mt-1">This will cancel the policy. You can reinstate it by switching back to Active.</p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            {/* Renew Modal */}
            <Modal isOpen={renewModalOpen} onClose={() => setRenewModalOpen(false)} title="Renew Policy">
                <form onSubmit={handleRenew} className="space-y-4">
                    <p className="text-sm text-surface-500">Renewing policy for <strong>{renewingPolicy?.customer?.name}</strong></p>
                    <div><label className="label">New Policy Number *</label><input className="input" required value={renewForm.policyNumber} onChange={(e) => setRenewForm({ ...renewForm, policyNumber: e.target.value })} /></div>
                    <div><label className="label">Start Date *</label><input type="date" className="input" required value={renewForm.startDate} onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })} /></div>
                    <div><label className="label">Expiry Date *</label><input type="date" className="input" required value={renewForm.expiryDate} onChange={(e) => setRenewForm({ ...renewForm, expiryDate: e.target.value })} /></div>
                    <div><label className="label">Premium Amount *</label><input type="number" min="0" step="0.01" className="input" required value={renewForm.premiumAmount} onChange={(e) => setRenewForm({ ...renewForm, premiumAmount: e.target.value })} /></div>
                    <div>
                        <label className="label">Initial Paid Amount (₹)</label>
                        <input 
                            type="number" 
                            min="0" 
                            max={renewForm.premiumAmount} 
                            step="0.01" 
                            className="input" 
                            placeholder="Leave empty if pending"
                            value={renewForm.paidAmount} 
                            onChange={(e) => setRenewForm({ ...renewForm, paidAmount: e.target.value })} 
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setRenewModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">Renew</button>
                    </div>
                </form>
            </Modal>

            {/* Smart Delete Confirmation Modal */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete this policy?">
                {deleteConfirm && (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <HiOutlineTrash className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">This action is permanent and cannot be undone.</p>
                                <p className="text-sm text-red-600 mt-1">
                                    {(deleteConfirm.counts.paymentsCount > 0 || deleteConfirm.counts.claimsCount > 0 || deleteConfirm.counts.followUpsCount > 0)
                                        ? <>You are about to delete the policy for <strong>{deleteConfirm.name}</strong> along with its linked records:</>
                                        : <>Are you sure you want to delete the policy for <strong>{deleteConfirm.name}</strong>?</>
                                    }
                                </p>
                            </div>
                        </div>

                        {(deleteConfirm.counts.paymentsCount > 0 || deleteConfirm.counts.claimsCount > 0 || deleteConfirm.counts.followUpsCount > 0) && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-surface-50 rounded-xl">
                                    <p className="text-2xl font-bold text-surface-900">{deleteConfirm.counts.paymentsCount}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">Payment{deleteConfirm.counts.paymentsCount !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="text-center p-3 bg-surface-50 rounded-xl">
                                    <p className="text-2xl font-bold text-surface-900">{deleteConfirm.counts.claimsCount}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">Claim{deleteConfirm.counts.claimsCount !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="text-center p-3 bg-surface-50 rounded-xl">
                                    <p className="text-2xl font-bold text-surface-900">{deleteConfirm.counts.followUpsCount}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">Follow-up{deleteConfirm.counts.followUpsCount !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 pt-4 mt-2 border-t border-surface-100">
                            <button type="button" onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 font-bold">Cancel</button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                                className="btn-danger flex-1 font-bold"
                            >
                                {deleteLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <button onClick={openCreate} className="fab lg:hidden"><HiOutlinePlus className="w-6 h-6" /></button>
        </div>
    );
};

export default Policies;
