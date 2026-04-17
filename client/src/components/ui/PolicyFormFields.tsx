import React from 'react';
import SearchableSelect from './SearchableSelect';
import { POLICY_TYPES, VEHICLE_CLASSES, PREMIUM_MODES } from '../../utils/constants';

interface PolicyFormFieldsProps {
    form: any;
    setForm: (val: any | ((prev: any) => any)) => void;
    companies: any[];
    dealers: any[];
    customers?: any[];
    isEditing?: boolean;
    showQuoteHeader?: boolean;
}

const PolicyFormFields: React.FC<PolicyFormFieldsProps> = ({ form, setForm, companies = [], dealers = [], customers = [], isEditing = false, showQuoteHeader = false }) => {
    const isMotor = form.policyType === 'motor';

    const handleChange = (field: string, value: any) => {
        if (typeof setForm === 'function') {
            setForm((prev: any) => {
                const updated = { ...prev, [field]: value };
                // Auto-sync: whenever premiumAmount changes, mirror it to totalPremium
                // so the backend always receives both fields correctly.
                if (field === 'premiumAmount') {
                    updated.totalPremium = value;
                }
                return updated;
            });
        }
    };

    const handleTypeChange = (val: string) => {
        setForm((prev: any) => ({
            ...prev,
            policyType: val,
            // Reset motor specific fields if switching away from motor
            ...(val !== 'motor' ? {
                vehicleNumber: '', make: '', model: '', vehicleClass: '',
                idv: '', od: '', tp: '', tax: '', totalPremium: '', registrationDate: ''
            } : {
                // Clear fields not needed for motor
                productName: '',
                sumInsured: ''
            })
        }));
    };

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${showQuoteHeader ? 'border-t border-surface-200 pt-4 mt-4' : ''}`}>
            {showQuoteHeader && (
                <div className="col-span-full">
                    <h3 className="font-semibold text-surface-900">Quote / Draft Details (Optional)</h3>
                    <p className="text-xs text-surface-500">Fill these out to auto-generate a policy upon conversion.</p>
                </div>
            )}
            
            {customers && customers.length > 0 && (
                <div>
                    <label className="label">Customer *</label>
                    <SearchableSelect
                        required
                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                        value={form.customerId || ''}
                        onChange={(val) => handleChange('customerId', val)}
                        placeholder="Select Customer"
                    />
                </div>
            )}

            <div>
                <label className="label">Policy Type *</label>
                <SearchableSelect
                    required
                    disabled={isEditing}
                    options={POLICY_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    value={form.policyType || ''}
                    onChange={handleTypeChange}
                    placeholder="Select Type"
                />
            </div>

            <div>
                <label className="label">Company</label>
                <SearchableSelect
                    options={companies
                        .filter(c => {
                            if (form.policyType === 'life') return c.name === 'LIC';
                            if (form.policyType === 'health') return ['Star Health Insurance', 'New India Assurance', 'Care Insurance'].includes(c.name);
                            if (form.policyType === 'motor') return !['Star Health Insurance', 'Care Insurance', 'LIC'].includes(c.name);
                            return true;
                        })
                        .map(c => ({ value: c?.id, label: c?.name }))
                    }
                    value={form.companyId || ''}
                    onChange={(val) => handleChange('companyId', val)}
                    allLabel="None"
                />
            </div>

            <div>
                <label className="label">Policy Number *</label>
                <input 
                    className="input" 
                    required 
                    value={form.policyNumber || ''} 
                    onChange={(e) => handleChange('policyNumber', e.target.value)} 
                    placeholder="Enter Policy Number"
                />
            </div>

            <div>
                <label className="label">Dealer</label>
                <SearchableSelect
                    options={dealers?.map(d => ({ value: d?.id, label: d?.name })) || []}
                    value={form.dealerId || ''}
                    onChange={(val) => handleChange('dealerId', val)}
                    allLabel="No Dealer"
                />
            </div>

            {form.policyType && form.policyType !== 'motor' && (
                <div>
                    <label className="label">Product Name</label>
                    <input 
                        className="input" 
                        value={form.productName || ''} 
                        onChange={(e) => handleChange('productName', e.target.value)} 
                        placeholder="e.g. Health Guard"
                    />
                </div>
            )}

            {isMotor && (
                <>
                    <div><label className="label">Vehicle Number</label>
                        <input className="input" value={form.vehicleNumber || ''} onChange={(e) => handleChange('vehicleNumber', e.target.value)} />
                    </div>
                    <div><label className="label">Make</label>
                        <input className="input" value={form.make || ''} onChange={(e) => handleChange('make', e.target.value)} />
                    </div>
                    <div><label className="label">Model</label>
                        <input className="input" value={form.model || ''} onChange={(e) => handleChange('model', e.target.value)} />
                    </div>
                    <div><label className="label">Date of Registration</label>
                        <input type="date" className="input" value={form.registrationDate?.split('T')[0] || ''} onChange={(e) => handleChange('registrationDate', e.target.value)} />
                    </div>
                    <div><label className="label">Vehicle Class</label>
                        <SearchableSelect
                            options={VEHICLE_CLASSES.map(c => ({ value: c, label: c.replace('_', ' ') }))}
                            value={form.vehicleClass || ''}
                            onChange={(val) => handleChange('vehicleClass', val)}
                            allLabel="Select Class"
                        />
                    </div>
                    <div><label className="label">IDV</label>
                        <input type="number" min="0" step="0.01" className="input" value={form.idv || ''} onChange={(e) => handleChange('idv', e.target.value)} />
                    </div>
                    <div><label className="label">OD Premium</label>
                        <input type="number" min="0" step="0.01" className="input" value={form.od || ''} onChange={(e) => handleChange('od', e.target.value)} />
                    </div>
                    <div><label className="label">TP Premium</label>
                        <input type="number" min="0" step="0.01" className="input" value={form.tp || ''} onChange={(e) => handleChange('tp', e.target.value)} />
                    </div>
                    <div><label className="label">Tax (GST)</label>
                        <input type="number" min="0" step="0.01" className="input" value={form.tax || ''} onChange={(e) => handleChange('tax', e.target.value)} />
                    </div>

                </>
            )}

            {form.policyType && form.policyType !== 'motor' && (
                <div>
                    <label className="label">Sum Insured</label>
                    <input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        className="input" 
                        value={form.sumInsured || ''} 
                        onChange={(e) => handleChange('sumInsured', e.target.value)} 
                    />
                </div>
            )}

            <div><label className="label">Premium Amount *</label>
                <input type="number" min="0" step="0.01" className="input" required value={form.premiumAmount || ''} onChange={(e) => handleChange('premiumAmount', e.target.value)} />
            </div>
            
            <div><label className="label">Start Date *</label>
                <input type="date" className="input" required value={form.startDate?.split('T')[0] || ''} onChange={(e) => handleChange('startDate', e.target.value)} />
            </div>
            
            <div><label className="label">Expiry Date *</label>
                <input type="date" className="input" required value={form.expiryDate?.split('T')[0] || ''} onChange={(e) => handleChange('expiryDate', e.target.value)} />
            </div>

            <div><label className="label">Payment Method</label>
                <SearchableSelect
                    options={['Cash', 'UPI', 'Cheque', 'Online', 'NEFT'].map(m => ({ value: m, label: m }))}
                    value={form.paymentMethod || ''}
                    onChange={(val) => handleChange('paymentMethod', val)}
                    placeholder="Select Method"
                />
            </div>

            {!isEditing && (
                <div>
                    <label className="label">Initial Paid Amount (₹)</label>
                    <input 
                        type="number" 
                        min="0" 
                        max={form.premiumAmount} 
                        step="0.01" 
                        className="input" 
                        placeholder="Leave empty if pending"
                        value={form.paidAmount || ''} 
                        onChange={(e) => handleChange('paidAmount', e.target.value)} 
                    />
                </div>
            )}

            <div><label className="label">No. of Years</label>
                <input type="number" className="input" min="1" value={form.noOfYears || '1'} onChange={(e) => handleChange('noOfYears', e.target.value)} />
            </div>
        </div>
    );
};

export default PolicyFormFields;