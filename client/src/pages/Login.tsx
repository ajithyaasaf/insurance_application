import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineShieldCheck, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';

const Login: React.FC = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'agent',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isRegister) {
                await register(form.name, form.email, form.password, form.role);
                toast.success('Account created successfully!');
            } else {
                await login(form.email, form.password);
                toast.success('Welcome back!');
            }
            navigate('/');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-4">
                        <HiOutlineShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">InsureCRM</h1>
                    <p className="text-surface-400 mt-1">
                        {isRegister ? 'Create your account' : 'Sign in to your account'}
                    </p>
                    {/* BETA_VERSION_NOTICE_START - Remove this block after beta */}
                    <p className="text-primary-400 mt-2 font-bold text-sm">
                        Note : this is a beta version
                    </p>
                    {/* BETA_VERSION_NOTICE_END */}
                </div>

                {/* Form Card */}
                <div className="bg-white/[0.08] backdrop-blur-xl rounded-3xl border border-white/10 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isRegister && (
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                    <input
                                        type="text"
                                        required={isRegister}
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 
                      text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 
                      focus:ring-primary-500/30 focus:border-primary-500/50 transition-all text-sm"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 
                    text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 
                    focus:ring-primary-500/30 focus:border-primary-500/50 transition-all text-sm"
                                    placeholder="agent@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 
                    text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 
                    focus:ring-primary-500/30 focus:border-primary-500/50 transition-all text-sm"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {isRegister && (
                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-1.5">
                                    Role
                                </label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 
                    text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 
                    focus:border-primary-500/50 transition-all text-sm"
                                >
                                    <option value="agent" className="bg-surface-800">Agent (Owner)</option>
                                    <option value="staff" className="bg-surface-800">Staff</option>
                                </select>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm
                hover:bg-primary-700 active:bg-primary-800 transition-all duration-200
                shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40
                disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : isRegister ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-sm text-surface-400 hover:text-primary-400 transition-colors"
                        >
                            {isRegister
                                ? 'Already have an account? Sign in'
                                : "Don't have an account? Register"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Attribution */}
            <div className="fixed bottom-8 left-0 right-0 text-center pointer-events-none animate-fade-in" style={{ animationDelay: '500ms' }}>
                <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-light">
                    Designed & Developed by <span className="text-white/40 font-medium">Ajith</span>
                </p>
            </div>
        </div>
    );
};

export default Login;
