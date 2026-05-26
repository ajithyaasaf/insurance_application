import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineShieldCheck, HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import Button from '../components/ui/Button';
import loginHero from '../assets/login-hero.png';

const Login: React.FC = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isRegister) {
                await register(form.name, form.email, form.password);
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
        <div className="min-h-screen flex flex-col md:flex-row bg-surface-950 text-white font-sans overflow-hidden">
            
            {/* Left Column: Premium Login Form */}
            <div className="w-full md:w-1/2 min-h-screen flex flex-col justify-between p-8 lg:p-16 relative overflow-hidden bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950/30">
                
                {/* Subtle background glow effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-600/5 rounded-full blur-[120px]" />
                </div>

                {/* Mobile background photo overlay (Watermark effect) */}
                <div className="absolute inset-0 block md:hidden pointer-events-none z-0">
                    <img 
                        src={loginHero} 
                        alt="Mobile Background" 
                        className="w-full h-full object-cover opacity-[0.06] filter saturate-[0.6] blur-[1px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/90 to-surface-950/50" />
                </div>

                {/* Top Logo / Branding */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 shadow-md shadow-primary-600/20">
                        <HiOutlineShieldCheck className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">InsureFlow</span>
                </div>

                {/* Central Form Container */}
                <div className="w-full max-w-md mx-auto my-auto py-12 relative z-10 animate-fade-in">
                    
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight text-white">
                            {isRegister ? 'Get Started' : 'Welcome Back'}
                        </h2>
                        <p className="text-surface-400 mt-2 text-sm">
                            {isRegister 
                                ? 'Create your professional account to manage client portfolios.' 
                                : 'Sign in to access your dashboard, policies, and commissions.'}
                        </p>
                    </div>

                    {/* Form Card (Glassmorphic Panel) */}
                    <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-2xl">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {isRegister && (
                                <div>
                                    <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-450 transition-colors group-focus-within:text-primary-450" />
                                        <input
                                            type="text"
                                            required={isRegister}
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 
                                                text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 
                                                focus:ring-primary-500/20 focus:border-primary-500/40 transition-all text-sm"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 
                                            text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 
                                            focus:ring-primary-500/20 focus:border-primary-500/40 transition-all text-sm"
                                        placeholder="agent@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                                    <input
                                        type="password"
                                        required
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 
                                            text-white placeholder:text-surface-600 focus:outline-none focus:ring-2 
                                            focus:ring-primary-500/20 focus:border-primary-500/40 transition-all text-sm"
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                isLoading={loading}
                                loadingText="Processing..."
                                className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-sm
                                    hover:bg-primary-700 active:bg-primary-800 transition-all duration-200
                                    shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40"
                            >
                                {isRegister ? 'Create Account' : 'Sign In'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Footer Attribution */}
                <div className="relative z-10 flex items-center justify-between text-xs text-surface-500">
                    <p>© {new Date().getFullYear()} InsureFlow CRM.</p>
                    <p className="tracking-wide">
                        Developed by <span className="text-white/60 font-semibold">Ajith</span>
                    </p>
                </div>
            </div>

            {/* Right Column: Dynamic Architectural Photographic Asset */}
            <div className="hidden md:flex md:w-1/2 relative bg-surface-950 items-end justify-start p-16 overflow-hidden">
                
                {/* Main Hero Photo Asset */}
                <img 
                    src={loginHero} 
                    alt="Insurance Client Collaboration" 
                    className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-10000 hover:scale-105"
                />

                {/* Dark Vignette Overlay for Premium Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-surface-950/30 via-transparent to-transparent pointer-events-none" />

                {/* Glassmorphic Slogan Panel */}
                <div className="relative z-10 max-w-lg bg-white/[0.04] backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <div className="w-8 h-1 bg-primary-500 rounded-full mb-4" />
                    <h3 className="text-2xl font-bold tracking-tight text-white mb-2 leading-tight">
                        Securing Futures, Simplifying Portfolios.
                    </h3>
                    <p className="text-sm text-surface-300 leading-relaxed font-light">
                        Empelling insurance professionals with next-generation analytics, automated commission calculations, and comprehensive policy management tools. 
                    </p>
                </div>
            </div>
            
        </div>
    );
};

export default Login;

