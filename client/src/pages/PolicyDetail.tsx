import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { formatDate, formatCurrency, getStatusColor, daysUntil, formatRelativeDate } from '../utils/format';
import toast from 'react-hot-toast';
import { 
    HiOutlineArrowLeft, 
    HiOutlineDocumentText, 
    HiOutlineUser, 
    HiOutlineOfficeBuilding, 
    HiOutlineClock,
    HiOutlineShieldCheck,
    HiOutlineRefresh,
    HiOutlineExclamationCircle,
    HiOutlineUserGroup
} from 'react-icons/hi';

const PolicyDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [policy, setPolicy] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const res = await api.get(`/policies/${id}`);
                setPolicy(res.data.data);
            } catch (err) {
                toast.error('Failed to load policy details');
                navigate('/policies');
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, [id, navigate]);

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" /></div>;
    if (!policy) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl transition-colors">
                    <HiOutlineArrowLeft className="w-5 h-5 text-surface-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-surface-900">Policy Details</h1>
                    <p className="text-xs text-surface-500">ID: {policy.id}</p>
                </div>
                <div className="ml-auto">
                    <span className={getStatusColor(policy.status)}>{policy.status}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card card-body space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><HiOutlineUser className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Customer</p>
                                    <p className="text-sm font-medium text-surface-900">{policy.customer?.name}</p>
                                    <p className="text-xs text-surface-500">{policy.customer?.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><HiOutlineOfficeBuilding className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Company</p>
                                    <p className="text-sm font-medium text-surface-900">{policy.company?.name}</p>
                                    <p className="text-xs text-surface-500">{policy.company?.category}</p>
                                </div>
                            </div>
                            {policy.dealer && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><HiOutlineUserGroup className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Dealer</p>
                                        <p className="text-sm font-medium text-surface-900">{policy.dealer?.name}</p>
                                        <p className="text-xs text-surface-500">{policy.dealer?.phone || 'Referred'}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><HiOutlineDocumentText className="w-5 h-5" /></div>
                                <div>
                                    <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Policy Details</p>
                                    <p className="text-sm font-medium text-surface-900">
                                        {policy.policyType === 'motor' ? `${policy.make || ''} ${policy.model || ''}`.trim() || 'Motor' : policy.productName || policy.policyType}
                                    </p>
                                    <p className="text-xs text-surface-500">No: {policy.policyNumber || 'N/A'}</p>
                                </div>
                            </div>
                            {policy.vehicleNumber && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><HiOutlineShieldCheck className="w-5 h-5" /></div>
                                    <div>
                                        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Vehicle Number</p>
                                        <p className="text-sm font-medium text-surface-900">{policy.vehicleNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {policy.policyType === 'motor' && (policy.make || policy.model || policy.vehicleClass || policy.paymentMethod) && (
                            <div className="pt-4 border-t border-surface-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {policy.make && <div>
                                    <p className="text-xs text-surface-500 mb-1">Make</p>
                                    <p className="text-sm font-medium text-surface-900">{policy.make}</p>
                                </div>}
                                {policy.model && <div>
                                    <p className="text-xs text-surface-500 mb-1">Model</p>
                                    <p className="text-sm font-medium text-surface-900">{policy.model}</p>
                                </div>}
                                {policy.vehicleClass && <div>
                                    <p className="text-xs text-surface-500 mb-1">Class</p>
                                    <p className="text-sm font-medium text-surface-900 uppercase">{policy.vehicleClass?.replace('_', ' ')}</p>
                                </div>}
                                {policy.paymentMethod && <div>
                                    <p className="text-xs text-surface-500 mb-1">Payment Method</p>
                                    <p className="text-sm font-medium text-surface-900 capitalize">{policy.paymentMethod}</p>
                                </div>}
                            </div>
                        )}

                        {policy.policyType === 'motor' && (policy.idv || policy.od || policy.tp || policy.tax || policy.totalPremium) && (
                            <div className="pt-4 border-t border-surface-100 grid grid-cols-2 sm:grid-cols-5 gap-4">
                                {policy.idv && <div>
                                    <p className="text-xs text-surface-500 mb-1">IDV</p>
                                    <p className="text-sm font-medium text-surface-900">{formatCurrency(policy.idv)}</p>
                                </div>}
                                {policy.od && <div>
                                    <p className="text-xs text-surface-500 mb-1">OD Premium</p>
                                    <p className="text-sm font-medium text-surface-900">{formatCurrency(policy.od)}</p>
                                </div>}
                                {policy.tp && <div>
                                    <p className="text-xs text-surface-500 mb-1">TP Premium</p>
                                    <p className="text-sm font-medium text-surface-900">{formatCurrency(policy.tp)}</p>
                                </div>}
                                {policy.tax && <div>
                                    <p className="text-xs text-surface-500 mb-1">Tax</p>
                                    <p className="text-sm font-medium text-surface-900">{formatCurrency(policy.tax)}</p>
                                </div>}
                                {policy.totalPremium && <div>
                                    <p className="text-xs text-surface-500 mb-1">Total Computed</p>
                                    <p className="text-sm font-bold text-surface-900">{formatCurrency(policy.totalPremium)}</p>
                                </div>}
                            </div>
                        )}

                        <div className="pt-6 border-t border-surface-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-surface-500 mb-1">Premium</p>
                                <p className="text-base font-bold text-surface-900">{formatCurrency(policy.premiumAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500 mb-1">Mode</p>
                                <p className="text-sm font-medium text-surface-900 capitalize">{policy.premiumMode}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500 mb-1">Start Date</p>
                                <p className="text-sm font-medium text-surface-900">{formatDate(policy.startDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500 mb-1">Expiry Date</p>
                                <p className="text-sm font-medium text-surface-900">{formatDate(policy.expiryDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Renewal History */}
                    <div className="card">
                        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                            <h2 className="font-semibold text-surface-900">Renewal History</h2>
                            <HiOutlineRefresh className="w-4 h-4 text-surface-400" />
                        </div>
                        <div className="p-5">
                            <div className="space-y-6">
                                {/* Parent Policy */}
                                {policy.parentPolicy && (
                                    <div className="flex gap-4 relative">
                                        <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-surface-100" />
                                        <div className="w-6 h-6 rounded-full bg-surface-100 border-2 border-surface-200 flex-shrink-0 z-10" />
                                        <div className="flex-1 pb-4">
                                            <div className="bg-surface-50 rounded-xl p-3 border border-surface-100 cursor-pointer hover:border-primary-200 transition-colors"
                                                 onClick={() => navigate(`/policies/${policy.parentPolicy.id}`)}>
                                                <div className="flex justify-between mb-1">
                                                    <p className="text-xs font-bold text-surface-400">PREVIOUS POLICY</p>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-surface-200 text-surface-600 rounded capitalize">{policy.parentPolicy.status}</span>
                                                </div>
                                                <p className="text-sm font-medium text-surface-900">{policy.parentPolicy.policyNumber || 'No Number'}</p>
                                                <p className="text-xs text-surface-500">{formatDate(policy.parentPolicy.startDate)} - {formatDate(policy.parentPolicy.expiryDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Current Policy */}
                                <div className="flex gap-4 relative">
                                    <div className={`absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-surface-100 ${policy.renewals?.length === 0 ? 'hidden' : ''}`} />
                                    <div className="w-6 h-6 rounded-full bg-primary-600 border-4 border-primary-50 flex-shrink-0 z-10" />
                                    <div className="flex-1 pb-4">
                                        <div className="bg-primary-50 rounded-xl p-3 border border-primary-100 ring-2 ring-primary-600/10">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-xs font-bold text-primary-600">CURRENT POLICY</p>
                                                <span className={getStatusColor(policy.status)}>{policy.status}</span>
                                            </div>
                                            <p className="text-sm font-medium text-surface-900">{policy.policyNumber || 'No Number'}</p>
                                            <p className="text-xs text-surface-500">{formatDate(policy.startDate)} - {formatDate(policy.expiryDate)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Renewals (Children) */}
                                {policy.renewals?.map((renewal: any) => (
                                    <div key={renewal.id} className="flex gap-4 relative last:mb-0">
                                        <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-surface-100 last:hidden" />
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-200 flex-shrink-0 z-10" />
                                        <div className="flex-1 pb-4">
                                            <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 cursor-pointer hover:border-emerald-300 transition-colors"
                                                 onClick={() => navigate(`/policies/${renewal.id}`)}>
                                                <div className="flex justify-between mb-1">
                                                    <p className="text-xs font-bold text-emerald-600 uppercase">RENEWED TO</p>
                                                    <span className={getStatusColor(renewal.status)}>{renewal.status}</span>
                                                </div>
                                                <p className="text-sm font-medium text-surface-900">{renewal.policyNumber || 'No Number'}</p>
                                                <p className="text-xs text-surface-500">{formatDate(renewal.startDate)} - {formatDate(renewal.expiryDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="card card-body">
                        <div className="flex items-center gap-2 mb-4">
                            <HiOutlineClock className="w-4 h-4 text-surface-400" />
                            <h3 className="text-sm font-bold text-surface-900">Timeline</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-surface-500">Days Left</p>
                                <p className={`text-xl font-bold ${daysUntil(policy.expiryDate) <= 30 ? 'text-red-600' : 'text-surface-900'}`}>
                                    {daysUntil(policy.expiryDate)} <span className="text-xs font-normal">days until expiry</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500">Created</p>
                                <p className="text-sm text-surface-700">{formatDate(policy.createdAt)} by {policy.createdBy}</p>
                            </div>
                        </div>
                    </div>

                    {/* Claims Card */}
                    <div className="card">
                        <div className="px-5 py-3 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">Claims</h3>
                                <span className="text-[10px] font-bold bg-surface-200 text-surface-600 px-1.5 py-0.5 rounded-full">{policy.claims?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] uppercase font-bold text-surface-500">NCB:</span>
                                {policy.hasNCB ? (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">YES</span>
                                ) : (
                                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">NO</span>
                                )}
                            </div>
                        </div>
                        <div className="p-4">
                            {policy.claims?.length === 0 ? (
                                <p className="text-center text-xs text-surface-400 py-2">No claims filed</p>
                            ) : (
                                <div className="space-y-3">
                                    {policy.claims.map((claim: any) => (
                                        <div key={claim.id} className="text-xs flex justify-between items-center border-b border-surface-50 pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium text-surface-900">{formatCurrency(claim.claimAmount)}</p>
                                                <p className="text-[10px] text-surface-500">{formatDate(claim.claimDate)}</p>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold ${getStatusColor(claim.status)}`}>
                                                {claim.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lost Reason if applicable */}
                    {policy.status === 'lost' && (
                        <div className="card card-body bg-red-50 border-red-100">
                            <div className="flex items-start gap-2">
                                <HiOutlineExclamationCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-red-700 uppercase mb-1">Lost Reason</p>
                                    <p className="text-sm text-red-600">{policy.lostReason || 'No reason provided'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PolicyDetail;
