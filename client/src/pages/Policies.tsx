import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import SearchableSelect from '../components/ui/SearchableSelect';
import PolicyFormFields from '../components/ui/PolicyFormFields';
import { formatDate, formatCurrency, getStatusColor, daysUntil, formatRelativeDate, scrollToFirstError } from '../utils/format';
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
    const [dealerFilter, setDealerFilter] = useState('');
    const [vehicleClassFilter, setVehicleClassFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [renewModalOpen, setRenewModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [renewingPolicy, setRenewingPolicy] = useState<any>(null);
    const [form, setForm] = useState({
        customerId: '', companyId: '', policyNumber: '', policyType: 'motor', vehicleNumber: '', startDate: '', expiryDate: '',
        sumInsured: '', premiumAmount: '', premiumMode: 'yearly', productName: '',
        make: '', model: '', vehicleClass: '', idv: '', od: '', tp: '', tax: '', totalPremium: '', paymentMethod: '', paidAmount: '', dealerId: '',
        registrationDate: '', policyOrigin: 'fresh', ncbPercentage: ''
    });
    const [editStatus, setEditStatus] = useState<'active' | 'cancelled'>('active');
    const [renewForm, setRenewForm] = useState({ 
        startDate: '', expiryDate: '', premiumAmount: '', totalPremium: '', policyNumber: '', paidAmount: '',
        od: '', tp: '', tax: '', policyOrigin: 'in_system_renewal', ncbPercentage: ''
    });
    const [renewingParentHadClaim, setRenewingParentHadClaim] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [renewErrors, setRenewErrors] = useState<Record<string, string>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; counts: { paymentsCount: number; claimsCount: number; followUpsCount: number } } | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchPolicies = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await api.get('/policies', { 
                params: { 
                    page, 
                    limit: 20, 
                    search: search || undefined, 
                    status: statusFilter || undefined, 
                    policyType: typeFilter || undefined, 
                    companyId: companyFilter || undefined,
                    dealerId: dealerFilter || undefined,
                    vehicleClass: vehicleClassFilter || undefined
                } 
            });
            setPolicies(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch policies'); } finally { setLoading(false); }
    }, [search, statusFilter, typeFilter, companyFilter, dealerFilter, vehicleClassFilter]);

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
        setForm({ customerId: '', companyId: '', policyNumber: '', policyType: 'motor', vehicleNumber: '', startDate: '', expiryDate: '', sumInsured: '', premiumAmount: '', premiumMode: 'yearly', productName: '', make: '', model: '', vehicleClass: '', idv: '', od: '', tp: '', tax: '', totalPremium: '', paymentMethod: '', paidAmount: '', dealerId: '', registrationDate: '', policyOrigin: 'fresh', ncbPercentage: '' });
        setEditStatus('active');
        setErrors({});
        setModalOpen(true);
    };

    const openEdit = (p: any) => {
        setEditing(p);
        setForm({
            customerId: p.customerId, companyId: p.companyId, policyNumber: p.policyNumber || '', policyType: p.policyType,
            vehicleNumber: p.vehicleNumber || '', startDate: p.startDate.split('T')[0], expiryDate: p.expiryDate.split('T')[0],
            sumInsured: p.sumInsured?.toString() || '', premiumAmount: p.premiumAmount.toString(), premiumMode: p.premiumMode,
            productName: p.productName || '',
            make: p.make || '', model: p.model || '', vehicleClass: p.vehicleClass || '', idv: p.idv?.toString() || '',
            od: p.od?.toString() || '', tp: p.tp?.toString() || '', tax: p.tax?.toString() || '', totalPremium: p.totalPremium?.toString() || '',
            paymentMethod: p.paymentMethod || '', paidAmount: '', dealerId: p.dealerId || '',
            registrationDate: p.registrationDate || '',
            policyOrigin: p.policyOrigin || 'fresh',
            ncbPercentage: p.ncbPercentage !== null && p.ncbPercentage !== undefined ? p.ncbPercentage.toString() : ''
        });
        setEditStatus((p.status === 'cancelled' ? 'cancelled' : 'active') as 'active' | 'cancelled');
        setErrors({});
        setModalOpen(true);
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.customerId) errs.customerId = 'Please select a customer';
        if (!form.policyType) errs.policyType = 'Please select a policy type';
        if (!form.companyId) errs.companyId = 'Please select a company';
        if (!form.policyNumber) errs.policyNumber = 'Policy number is required';
        if (!form.premiumAmount || parseFloat(form.premiumAmount) <= 0) errs.premiumAmount = 'Valid premium amount is required';
        if (!form.startDate) errs.startDate = 'Start date is required';
        if (!form.expiryDate) errs.expiryDate = 'Expiry date is required';

        if (form.policyType === 'motor') {
            if (!form.vehicleNumber) errs.vehicleNumber = 'Vehicle number is required';
            if (!form.make) errs.make = 'Make is required';
            if (!form.model) errs.model = 'Model is required';
        }
        return errs;
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
                ...form,
                sumInsured: form.policyType === 'motor' ? undefined : (form.sumInsured ? parseFloat(form.sumInsured) : undefined),
                premiumAmount: parseFloat(form.premiumAmount),
                productName: form.policyType === 'motor' ? undefined : (form.productName || undefined),
                idv: form.idv ? parseFloat(form.idv) : undefined,
                od: form.od ? parseFloat(form.od) : undefined,
                tp: form.tp ? parseFloat(form.tp) : undefined,
                tax: form.tax ? parseFloat(form.tax) : undefined,
                totalPremium: form.totalPremium ? parseFloat(form.totalPremium) : (form.premiumAmount ? parseFloat(form.premiumAmount) : undefined),
                make: form.make || undefined,
                model: form.model || undefined,
                vehicleClass: form.vehicleClass || undefined,
                registrationDate: form.registrationDate || undefined,
                paymentMethod: form.paymentMethod || undefined,
                paidAmount: form.paidAmount ? parseFloat(form.paidAmount) : undefined,
                dealerId: form.dealerId || undefined,
                policyOrigin: form.policyOrigin,
                ncbPercentage: form.ncbPercentage ? parseFloat(form.ncbPercentage as string) : undefined,
                ...(editing ? { status: editStatus } : {}),
            };
            if (editing) { await api.put(`/policies/${editing.id}`, payload); toast.success('Policy updated'); }
            else { await api.post('/policies', payload); toast.success('Policy created'); }
            setModalOpen(false); fetchPolicies(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: string, customerName: string) => {
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

    const handleRenewChange = (field: string, value: string) => {
        setRenewForm(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'od' || field === 'tp' || field === 'tax' || field === 'premiumAmount') {
                const od = parseFloat(field === 'od' ? value : prev.od) || 0;
                const tp = parseFloat(field === 'tp' ? value : prev.tp) || 0;
                const tax = parseFloat(field === 'tax' ? value : prev.tax) || 0;
                if (field === 'od' || field === 'tp') {
                    updated.premiumAmount = (od + tp).toString();
                }
                const net = parseFloat(updated.premiumAmount || prev.premiumAmount) || 0;
                updated.totalPremium = (net + tax).toString();
            }
            return updated;
        });
        setRenewErrors(prev => ({ ...prev, [field]: '' }));
    };

    const openRenew = (p: any) => {
        setRenewingPolicy(p);
        const expiry = new Date(p.expiryDate);
        const now = new Date();
        const start = expiry > now ? expiry : now;
        const newExpiry = new Date(start);
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        setRenewForm({
            startDate: start.toISOString().split('T')[0],
            expiryDate: newExpiry.toISOString().split('T')[0],
            premiumAmount: p.premiumAmount.toString(),
            totalPremium: (p.totalPremium || p.premiumAmount).toString(),
            policyNumber: '',
            paidAmount: '',
            od: p.od?.toString() || '',
            tp: p.tp?.toString() || '',
            tax: p.tax?.toString() || '',
            policyOrigin: 'in_system_renewal',
            ncbPercentage: '',
        });
        const parentHadClaim = p.claims?.some((c: any) => c.status !== 'REJECTED');
        setRenewingParentHadClaim(!!parentHadClaim);
        setRenewErrors({});
        setRenewModalOpen(true);
    };

    const validateRenew = () => {
        const errs: Record<string, string> = {};
        if (!renewForm.policyNumber) errs.policyNumber = 'New policy number is required';
        if (!renewForm.startDate) errs.startDate = 'Start date is required';
        if (!renewForm.expiryDate) errs.expiryDate = 'Expiry date is required';
        if (!renewForm.premiumAmount || parseFloat(renewForm.premiumAmount) <= 0) errs.premiumAmount = 'Valid premium amount is required';
        return errs;
    };

    const handleRenew = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validateRenew();
        if (Object.keys(errs).length > 0) {
            setRenewErrors(errs);
            scrollToFirstError();
            return;
        }
        setRenewErrors({});
        try {
            await api.post(`/policies/${renewingPolicy.id}/renew`, {
                ...renewForm, 
                premiumAmount: parseFloat(renewForm.premiumAmount),
                totalPremium: renewForm.totalPremium ? parseFloat(renewForm.totalPremium) : undefined,
                od: renewForm.od ? parseFloat(renewForm.od) : undefined,
                tp: renewForm.tp ? parseFloat(renewForm.tp) : undefined,
                tax: renewForm.tax ? parseFloat(renewForm.tax) : undefined,
                paidAmount: renewForm.paidAmount ? parseFloat(renewForm.paidAmount) : undefined,
                ncbPercentage: renewForm.ncbPercentage ? parseFloat(renewForm.ncbPercentage.toString()) : undefined,
            });
            toast.success('Policy renewed!');
            setRenewModalOpen(false); fetchPolicies(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

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
                <SearchableSelect
                    className="w-full sm:w-48"
                    options={dealers.map(d => ({ value: d.id, label: d.name }))}
                    value={dealerFilter}
                    onChange={setDealerFilter}
                    allLabel="All Dealers"
                    placeholder="Search dealer..."
                />
                <SearchableSelect
                    className="w-full sm:w-40"
                    options={VEHICLE_CLASSES.map(v => ({ value: v, label: formatVehicleClass(v) }))}
                    value={vehicleClassFilter}
                    onChange={setVehicleClassFilter}
                    allLabel="All Classes"
                    placeholder="Search class..."
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
                                        <td className="capitalize">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {p.policyType}
                                                {p.policyType === 'motor' && p.vehicleClass && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-100 text-surface-700 border border-surface-200 uppercase">
                                                        {formatVehicleClass(p.vehicleClass)}
                                                    </span>
                                                )}
                                                {p.policyOrigin === 'external_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">External</span>}
                                                {p.policyOrigin === 'in_system_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">Renewal</span>}
                                                {p.policyOrigin === 'fresh' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-100 text-surface-600">Fresh</span>}
                                            </div>
                                        </td>
                                        <td className="text-xs">{p.company?.name}</td>
                                        <td className="font-medium">{formatCurrency(p.totalPremium || p.premiumAmount)}</td>
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
                                                {(p.status === 'active' || p.status === 'expired') && p._count?.renewals === 0 && <button onClick={() => openRenew(p)} className="btn-ghost btn-sm text-emerald-600" title="Renew"><HiOutlineRefresh className="w-3.5 h-3.5" /></button>}
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
                                        <p className="text-xs text-surface-500 capitalize flex items-center gap-1.5">
                                            {p.policyType} • {p.company?.name}
                                            {p.policyOrigin === 'external_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-amber-200 text-[10px] font-medium bg-amber-50 text-amber-800">External</span>}
                                            {p.policyOrigin === 'in_system_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-blue-200 text-[10px] font-medium bg-blue-50 text-blue-800">Renewal</span>}
                                            {p.policyOrigin === 'fresh' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-surface-200 text-[10px] font-medium bg-surface-50 text-surface-600">Fresh</span>}
                                        </p>
                                    </div>
                                    <span className={getStatusColor(p.status)}>{p.status}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-3">
                                    <span className="text-surface-500">Premium: <strong className="text-surface-900">{formatCurrency(p.totalPremium || p.premiumAmount)}</strong></span>
                                    <span className={`text-xs ${daysUntil(p.expiryDate) <= 30 ? 'text-amber-600' : 'text-surface-500'}`}>{formatRelativeDate(p.expiryDate)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate(`/policies/${p.id}`)} className="btn-secondary btn-sm flex-1">View</button>
                                    <button onClick={() => openEdit(p)} className="btn-secondary btn-sm flex-1">Edit</button>
                                    {(p.status === 'active' || p.status === 'expired') && p._count?.renewals === 0 && <button onClick={() => openRenew(p)} className="btn-primary btn-sm flex-1">Renew</button>}
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
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <PolicyFormFields 
                        form={form} 
                        setForm={setForm} 
                        companies={companies} 
                        dealers={dealers} 
                        customers={customers} 
                        isEditing={!!editing} 
                        errors={errors}
                        setErrors={setErrors}
                    />

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
                <form onSubmit={handleRenew} className="space-y-4" noValidate>
                    <p className="text-sm text-surface-500">Renewing policy for <strong>{renewingPolicy?.customer?.name}</strong></p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className="label">New Policy Number *</label>
                            <input className={`input ${renewErrors.policyNumber ? 'border-red-500 focus:ring-red-400' : ''}`} value={renewForm.policyNumber} onChange={(e) => handleRenewChange('policyNumber', e.target.value)} />
                            {renewErrors.policyNumber && <p className="text-xs text-red-500 mt-1">{renewErrors.policyNumber}</p>}
                        </div>

                        <div>
                            <label className="label">Start Date *</label>
                            <input type="date" className={`input ${renewErrors.startDate ? 'border-red-500 focus:ring-red-400' : ''}`} value={renewForm.startDate} onChange={(e) => handleRenewChange('startDate', e.target.value)} />
                            {renewErrors.startDate && <p className="text-xs text-red-500 mt-1">{renewErrors.startDate}</p>}
                        </div>

                        <div>
                            <label className="label">Expiry Date *</label>
                            <input type="date" className={`input ${renewErrors.expiryDate ? 'border-red-500 focus:ring-red-400' : ''}`} value={renewForm.expiryDate} onChange={(e) => handleRenewChange('expiryDate', e.target.value)} />
                            {renewErrors.expiryDate && <p className="text-xs text-red-500 mt-1">{renewErrors.expiryDate}</p>}
                        </div>

                        {renewingPolicy?.policyType === 'motor' && (
                            <>
                                <div>
                                    <label className="label">Policy Origin *</label>
                                    <SearchableSelect
                                        disabled={true}
                                        options={[{ value: 'in_system_renewal', label: 'In-System Renewal' }]}
                                        value={renewForm.policyOrigin}
                                        onChange={() => {}}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="label">NCB Applied %</label>
                                    <SearchableSelect
                                        options={[
                                            { value: '0', label: 'None (0%)' },
                                            { value: '20', label: '20%' },
                                            { value: '25', label: '25%' },
                                            { value: '35', label: '35%' },
                                            { value: '45', label: '45%' },
                                            { value: '50', label: '50%' },
                                        ]}
                                        value={renewForm.ncbPercentage !== null && renewForm.ncbPercentage !== undefined ? renewForm.ncbPercentage.toString() : ''}
                                        onChange={(val) => handleRenewChange('ncbPercentage', val)}
                                        allLabel="Leave blank / N/A"
                                    />
                                    {renewingParentHadClaim && (
                                        <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
                                            ⚠️ Parent policy had a claim. NCB is not applicable — enter 0% or leave blank.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="label">OD Premium</label>
                                    <input type="number" min="0" step="0.01" className="input" value={renewForm.od} onChange={(e) => handleRenewChange('od', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">TP Premium</label>
                                    <input type="number" min="0" step="0.01" className="input" value={renewForm.tp} onChange={(e) => handleRenewChange('tp', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Tax (GST)</label>
                                    <input type="number" min="0" step="0.01" className="input" value={renewForm.tax} onChange={(e) => handleRenewChange('tax', e.target.value)} />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="label">Net Premium (OD + TP) *</label>
                            <input type="number" min="0" step="0.01" className={`input ${renewErrors.premiumAmount ? 'border-red-500 focus:ring-red-400' : ''}`} value={renewForm.premiumAmount} onChange={(e) => handleRenewChange('premiumAmount', e.target.value)} />
                            {renewErrors.premiumAmount && <p className="text-xs text-red-500 mt-1">{renewErrors.premiumAmount}</p>}
                        </div>

                        <div>
                            <label className="label">Total Premium (Net + Tax)</label>
                            <input type="number" min="0" step="0.01" className="input" value={renewForm.totalPremium} onChange={(e) => handleRenewChange('totalPremium', e.target.value)} />
                        </div>

                        <div className="col-span-full">
                            <label className="label">Initial Paid Amount (₹)</label>
                            <input 
                                type="number" 
                                min="0" 
                                max={parseFloat(renewForm.totalPremium || renewForm.premiumAmount) || 0} 
                                step="0.01" 
                                className="input" 
                                placeholder="Leave empty if pending"
                                value={renewForm.paidAmount} 
                                onChange={(e) => handleRenewChange('paidAmount', e.target.value)} 
                            />
                        </div>
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
