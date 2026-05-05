import React from 'react';
import { LuConstruction, LuClock, LuMail } from 'react-icons/lu';

const UnderConstruction: React.FC = () => {
    return (
        <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-500 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="max-w-2xl w-full">
                {/* Illustration Wrapper */}
                <div className="mb-10 relative inline-block">
                    <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full" />
                    <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-surface-200">
                        <LuConstruction className="text-7xl text-primary-600 animate-bounce mb-2 mx-auto" />
                        <h1 className="text-4xl font-black text-surface-900 tracking-tight mb-2">
                            Under Construction
                        </h1>
                        <p className="text-surface-500 font-medium">
                            We're crafting something exceptional for you.
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-6 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                                <LuClock className="text-2xl" />
                            </div>
                            <h3 className="font-bold text-surface-900">Coming Soon</h3>
                            <p className="text-xs text-surface-500">We are working hard to finish the development of this site.</p>
                        </div>
                        <div className="card p-6 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <LuConstruction className="text-2xl" />
                            </div>
                            <h3 className="font-bold text-surface-900">Maintenance</h3>
                            <p className="text-xs text-surface-500">The site is currently undergoing scheduled maintenance.</p>
                        </div>
                        <div className="card p-6 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <LuMail className="text-2xl" />
                            </div>
                            <h3 className="font-bold text-surface-900">Contact Us</h3>
                            <p className="text-xs text-surface-500">Need immediate help? Reach out to our support team.</p>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-surface-200">
                        <p className="text-surface-400 text-sm mb-4">
                            &copy; {new Date().getFullYear()} Insurance Application. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnderConstruction;
