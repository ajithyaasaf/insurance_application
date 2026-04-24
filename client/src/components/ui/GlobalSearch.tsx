import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { HiOutlineSearch, HiOutlineUser, HiOutlineTrendingUp, HiOutlineDocumentText } from 'react-icons/hi';

const GlobalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const res = await api.get(`/search?q=${query}`);
                    setResults(res.data.data);
                    setIsOpen(true);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults(null);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (type: string, id: string) => {
        setIsOpen(false);
        setQuery('');
        if (type === 'customer') navigate('/customers');
        if (type === 'lead') navigate('/leads');
        if (type === 'policy') navigate('/policies');
    };

    return (
        <div className="relative w-full max-w-md" ref={wrapperRef}>
            <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-100 border-none focus:ring-2 focus:ring-primary-500/20 text-sm transition-all"
                    placeholder="Search name, phone, vehicle..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full" />
                    </div>
                )}
            </div>

            {isOpen && results && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden z-50 animate-fade-in">
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {results.customers.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-surface-400 uppercase px-3 py-1 tracking-wider">Customers</p>
                                {results.customers.map((c: any) => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleSelect('customer', c.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-50 rounded-lg transition-colors text-left"
                                    >
                                        <HiOutlineUser className="w-4 h-4 text-blue-500" />
                                        <div>
                                            <p className="text-sm font-medium text-surface-900">{c.name}</p>
                                            <p className="text-xs text-surface-500">{c.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.leads.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[10px] font-bold text-surface-400 uppercase px-3 py-1 tracking-wider">Leads</p>
                                {results.leads.map((l: any) => (
                                    <button
                                        key={l.id}
                                        onClick={() => handleSelect('lead', l.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-50 rounded-lg transition-colors text-left"
                                    >
                                        <HiOutlineTrendingUp className="w-4 h-4 text-violet-500" />
                                        <div>
                                            <p className="text-sm font-medium text-surface-900">{l.name}</p>
                                            <p className="text-xs text-surface-500">{l.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.policies.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-surface-400 uppercase px-3 py-1 tracking-wider">Policies</p>
                                {results.policies.map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelect('policy', p.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-50 rounded-lg transition-colors text-left"
                                    >
                                        <HiOutlineDocumentText className="w-4 h-4 text-emerald-500" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-surface-900">{p.customer?.name}</p>
                                            <p className="text-[10px] text-surface-500">{p.vehicleNumber || p.policyNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-primary-600">₹{(p.totalPremium || p.premiumAmount || 0).toLocaleString('en-IN')}</p>
                                            <p className="text-[9px] text-surface-400 capitalize">{p.status}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.customers.length === 0 && results.leads.length === 0 && results.policies.length === 0 && (
                            <p className="text-center py-4 text-sm text-surface-400">No results found</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
