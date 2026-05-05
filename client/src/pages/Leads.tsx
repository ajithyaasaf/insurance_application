import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import SearchableSelect from '../components/ui/SearchableSelect';
import PolicyFormFields from '../components/ui/PolicyFormFields';
import { formatDate, getStatusColor, scrollToFirstError, formatVehicleClass } from '../utils/format';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineUserAdd, HiOutlineTrendingUp } from 'react-icons/hi';
import { LEAD_STATUSES as statusOptions, VEHICLE_CLASSES } from '../utils/constants';

const Leads: React.FC = () => {
    const [leads, setLeads] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [dealers, setDealers] = useState<any[]>([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [vehicleClassFilter, setVehicleClassFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [convertingLead, setConvertingLead] = useState<any>(null);

    // Initial State including Quote Fields
    const initialFormState = {
        name: '', phone: '', interestedProduct: '', status: 'new', nextFollowUpDate: '', notes: '',
        policyType: '', companyId: '', vehicleNumber: '', make: '', model: '', vehicleClass: '',
        idv: '', od: '', tp: '', tax: '', totalPremium: '', premiumAmount: '', startDate: '', expiryDate: '',
        dealerId: '', registrationDate: '', policyOrigin: 'fresh', ncbPercentage: ''
    };
    const [form, setForm] = useState(initialFormState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [convertForm, setConvertForm] = useState({ address: '', email: '', policyOrigin: 'fresh', ncbPercentage: '' });

    const fetchLeads = useCallback(async (page = 1, status = statusFilter, vehicleClass = vehicleClassFilter) => {
        setLoading(true);
        try {
            const res = await api.get('/leads', {
                params: {
                    page,
                    limit: meta.limit,
                    search: search || undefined,
                    status: status || undefined,
                    vehicleClass: vehicleClass || undefined
                }
            });
            setLeads(res.data.data);
            setMeta(res.data.meta);
        } catch { toast.error('Failed to fetch leads'); } finally { setLoading(false); }
    }, [search, statusFilter, vehicleClassFilter]);

    useEffect(() => {
        fetchLeads();
        const loadInitialData = async () => {
            try {
                const [compRes, dealerRes] = await Promise.all([
                    api.get('/companies'),
                    api.get('/dealers')
                ]);
                setCompanies(compRes.data.data);
                setDealers(dealerRes.data.data);
            } catch { }
        };
        loadInitialData();
    }, [fetchLeads]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.phone) errs.phone = 'Phone number is required';
        else if (!/^[0-9]{10}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit phone number';
        if (!form.status) errs.status = 'Please select a status';
        return errs;
    };

    const openCreate = () => {
        setEditing(null);
        setForm(initialFormState);
        setErrors({});
        setModalOpen(true);
    };

    const openEdit = (lead: any) => {
        setEditing(lead);
        setErrors({});
        setForm({
            ...initialFormState,
            name: lead.name, phone: lead.phone || '', interestedProduct: lead.interestedProduct || '',
            status: lead.status, nextFollowUpDate: lead.nextFollowUpDate?.split('T')[0] || '', notes: lead.notes || '',
            policyType: lead.policyType || '', companyId: lead.companyId || '', vehicleNumber: lead.vehicleNumber || '',
            make: lead.make || '', model: lead.model || '', vehicleClass: lead.vehicleClass || '',
            idv: lead.idv?.toString() || '', od: lead.od?.toString() || '', tp: lead.tp?.toString() || '',
            tax: lead.tax?.toString() || '', totalPremium: lead.totalPremium?.toString() || '',
            premiumAmount: lead.premiumAmount?.toString() || '',
            startDate: lead.startDate?.split('T')[0] || '', expiryDate: lead.expiryDate?.split('T')[0] || '',
            dealerId: lead.dealerId || '', registrationDate: lead.registrationDate?.split('T')[0] || '',
            policyOrigin: lead.policyOrigin || 'fresh',
            ncbPercentage: lead.ncbPercentage !== null && lead.ncbPercentage !== undefined ? lead.ncbPercentage.toString() : ''
        });
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
            // Parse numbers for payload
            const payload = {
                ...form,
                nextFollowUpDate: form.nextFollowUpDate || undefined,
                policyType: form.policyType || undefined,
                companyId: form.companyId || undefined,
                vehicleNumber: form.vehicleNumber || undefined,
                make: form.make || undefined,
                model: form.model || undefined,
                vehicleClass: form.vehicleClass || undefined,
                startDate: form.startDate || undefined,
                expiryDate: form.expiryDate || undefined,
                dealerId: form.dealerId || undefined,
                idv: form.idv ? parseFloat(form.idv) : undefined,
                od: form.od ? parseFloat(form.od) : undefined,
                tp: form.tp ? parseFloat(form.tp) : undefined,
                tax: form.tax ? parseFloat(form.tax) : undefined,
                totalPremium: form.totalPremium ? parseFloat(form.totalPremium) : (form.premiumAmount ? parseFloat(form.premiumAmount) : undefined),
                premiumAmount: form.premiumAmount ? parseFloat(form.premiumAmount) : undefined,
                registrationDate: form.registrationDate || undefined,
                policyOrigin: form.policyOrigin,
                ncbPercentage: form.ncbPercentage ? parseFloat(form.ncbPercentage as string) : undefined,
            };

            if (editing) {
                await api.put(`/leads/${editing.id}`, payload);
                toast.success('Lead updated');
            } else {
                await api.post('/leads', payload);
                toast.success('Lead created');
            }
            setModalOpen(false);
            fetchLeads(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this lead?')) return;
        try {
            await api.delete(`/leads/${id}`);
            toast.success('Lead deleted');
            fetchLeads(meta.page);
        } catch { toast.error('Failed to delete'); }
    };

    const openConvert = (lead: any) => {
        setConvertingLead(lead);
        setConvertForm({
            address: '', email: '',
            policyOrigin: lead.policyOrigin || 'fresh',
            ncbPercentage: lead.ncbPercentage !== null && lead.ncbPercentage !== undefined ? lead.ncbPercentage.toString() : ''
        });
        setConvertModalOpen(true);
    };

    const handleConvert = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/leads/${convertingLead.id}/convert`, convertForm);
            toast.success('Lead converted to customer!');
            setConvertModalOpen(false);
            fetchLeads(meta.page);
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Leads</h1>
                <button onClick={openCreate} className="btn-primary"><HiOutlinePlus className="w-4 h-4" /> Add Lead</button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input className="input pl-10" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <SearchableSelect
                    className="w-full sm:w-40"
                    options={statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allLabel="All Status"
                    placeholder="Search status..."
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

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : leads.length === 0 ? (
                <EmptyState message="No leads found" icon={<HiOutlineTrendingUp className="w-12 h-12" />} />
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="table-container hidden sm:block">
                        <table className="table">
                            <thead>
                                <tr><th>Name</th><th>Phone</th><th>Product</th><th>Status</th><th>Follow-up</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id}>
                                        <td className="font-medium text-surface-900">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {lead.name}
                                                {lead.policyType === 'motor' && lead.vehicleClass && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-100 text-surface-700 border border-surface-200 uppercase">
                                                        {formatVehicleClass(lead.vehicleClass)}
                                                    </span>
                                                )}
                                                {lead.policyOrigin === 'external_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">External</span>}
                                                {lead.policyOrigin === 'in_system_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">Renewal</span>}
                                                {lead.policyOrigin === 'fresh' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-100 text-surface-600">Fresh</span>}
                                            </div>
                                        </td>
                                        <td>{lead.phone || '—'}</td>
                                        <td>{lead.interestedProduct || '—'}</td>
                                        <td><span className={getStatusColor(lead.status)}>{lead.status}</span></td>
                                        <td>{lead.nextFollowUpDate ? formatDate(lead.nextFollowUpDate) : '—'}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(lead)} className="btn-ghost btn-sm"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                                                {lead.status !== 'converted' && <button onClick={() => openConvert(lead)} className="btn-ghost btn-sm text-emerald-600"><HiOutlineUserAdd className="w-3.5 h-3.5" /></button>}
                                                <button onClick={() => handleDelete(lead.id)} className="btn-ghost btn-sm text-red-500"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                        {leads.map((lead) => (
                            <div key={lead.id} className="card card-body">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-surface-900 flex items-center gap-1.5">
                                            {lead.name}
                                            {lead.policyOrigin === 'external_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-amber-200 text-[10px] font-medium bg-amber-50 text-amber-800">External</span>}
                                            {lead.policyOrigin === 'in_system_renewal' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-blue-200 text-[10px] font-medium bg-blue-50 text-blue-800">Renewal</span>}
                                            {lead.policyOrigin === 'fresh' && <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-surface-200 text-[10px] font-medium bg-surface-50 text-surface-600">Fresh</span>}
                                        </p>
                                        <p className="text-xs text-surface-500">{lead.phone || 'No phone'}</p>
                                    </div>
                                    <span className={getStatusColor(lead.status)}>{lead.status}</span>
                                </div>
                                {lead.interestedProduct && <p className="text-xs text-surface-500 mb-2">Product: {lead.interestedProduct}</p>}
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => openEdit(lead)} className="btn-secondary btn-sm flex-1">Edit</button>
                                    {lead.status !== 'converted' && <button onClick={() => openConvert(lead)} className="btn-primary btn-sm flex-1">Convert</button>}
                                    <button onClick={() => handleDelete(lead.id)} className="btn-danger btn-sm">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchLeads(p)} />
                </>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Lead' : 'New Lead'}>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                        <label className="label">Name *</label>
                        <input
                            className={`input ${errors.name ? 'border-red-500 focus:ring-red-400' : ''}`}
                            data-error-field={errors.name ? 'true' : undefined}
                            placeholder="Enter full name"
                            value={form.name}
                            onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors(prev => ({ ...prev, name: '' })); }}
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="label">Phone *</label>
                        <input
                            type="tel"
                            className={`input ${errors.phone ? 'border-red-500 focus:ring-red-400' : ''}`}
                            data-error-field={errors.phone ? 'true' : undefined}
                            placeholder="9876543210"
                            value={form.phone}
                            onChange={(e) => { setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }); setErrors(prev => ({ ...prev, phone: '' })); }}
                        />
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div><label className="label">Interested Product</label><input className="input" value={form.interestedProduct} onChange={(e) => setForm({ ...form, interestedProduct: e.target.value })} /></div>
                    <div>
                        <label className="label">Status *</label>
                        <SearchableSelect
                            options={statusOptions.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                            value={form.status}
                            onChange={(val) => { setForm({ ...form, status: val }); setErrors(prev => ({ ...prev, status: '' })); }}
                            placeholder="Select Status"
                            hasError={!!errors.status}
                        />
                        {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
                    </div>
                    <div><label className="label">Next Follow-up Date</label><input type="date" className="input" value={form.nextFollowUpDate} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} /></div>
                    <div><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

                    <PolicyFormFields form={form} setForm={setForm} companies={companies} dealers={dealers} showQuoteHeader />

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>

            {/* Convert Modal */}
            <Modal isOpen={convertModalOpen} onClose={() => setConvertModalOpen(false)} title="Convert Lead to Customer">
                <form onSubmit={handleConvert} className="space-y-4">
                    <p className="text-sm text-surface-500">Converting <strong>{convertingLead?.name}</strong> to a customer.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-surface-200 pb-4 mb-4">
                        <div>
                            <label className="label">Policy Origin *</label>
                            <SearchableSelect
                                options={[
                                    { value: 'fresh', label: 'Fresh (New Policy)' },
                                    { value: 'external_renewal', label: 'External Renewal (Prior outside policy)' },
                                ]}
                                value={convertForm.policyOrigin}
                                onChange={(val) => setConvertForm({ ...convertForm, policyOrigin: val })}
                                placeholder="Select Origin"
                            />
                        </div>
                        {convertingLead?.policyType === 'motor' && convertForm.policyOrigin !== 'fresh' && (
                            <div>
                                <label className="label">
                                    {convertForm.policyOrigin === 'external_renewal' ? 'Prior NCB (from previous insurer) %' : 'NCB Applied %'}
                                </label>
                                <SearchableSelect
                                    options={[
                                        { value: '0', label: 'None (0%)' },
                                        { value: '20', label: '20%' },
                                        { value: '25', label: '25%' },
                                        { value: '35', label: '35%' },
                                        { value: '45', label: '45%' },
                                        { value: '50', label: '50%' },
                                    ]}
                                    value={convertForm.ncbPercentage}
                                    onChange={(val) => setConvertForm({ ...convertForm, ncbPercentage: val })}
                                    allLabel="Leave blank / N/A"
                                />
                            </div>
                        )}
                    </div>

                    <div><label className="label">Customer Email (Optional)</label><input type="email" className="input" value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} /></div>
                    <div><label className="label">Customer Address (Optional)</label><textarea className="input" rows={2} value={convertForm.address} onChange={(e) => setConvertForm({ ...convertForm, address: e.target.value })} /></div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setConvertModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" className="btn-primary flex-1">Convert</button>
                    </div>
                </form>
            </Modal>

            <button onClick={openCreate} className="fab lg:hidden"><HiOutlinePlus className="w-6 h-6" /></button>
        </div>
    );
};

export default Leads;
