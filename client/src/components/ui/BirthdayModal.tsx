import React, { useEffect, useState, useRef } from 'react';
import { HiOutlineSparkles, HiOutlineX, HiHeart, HiGift } from 'react-icons/hi';

interface BirthdayModalProps {
    onClose?: () => void;
}

const isBirthdayDate = () => {
    const today = new Date();
    // August is Month Index 7 in JS (Jan=0, Aug=7) and Date is 20
    return today.getMonth() === 7 && today.getDate() === 20;
};

const BirthdayModal: React.FC<BirthdayModalProps> = ({ onClose }) => {
    const [isOpen, setIsOpen] = useState(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        // Check if today is August 20th
        if (!isBirthdayDate()) return false;
        // Check if dismissed for current year
        const dismissed = localStorage.getItem(`birthday_modal_dismissed_${currentYear}`);
        return !dismissed;
    });
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const handleDismiss = () => {
        const currentYear = new Date().getFullYear();
        localStorage.setItem(`birthday_modal_dismissed_${currentYear}`, 'true');
        setIsOpen(false);
        if (onClose) onClose();
    };

    // Festive Confetti Particle Drop Canvas Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Vibrant celebratory party colors
        const colors = ['#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899', '#8B5CF6', '#3B82F6', '#FBBF24', '#F43F5E'];

        interface Particle {
            x: number;
            y: number;
            size: number;
            color: string;
            speedX: number;
            speedY: number;
            rotation: number;
            rotationSpeed: number;
            shape: 'circle' | 'square' | 'strip';
        }

        const particles: Particle[] = Array.from({ length: 65 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height - height,
            size: Math.random() * 8 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2.5 + 1.8,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 3 - 1.5,
            shape: Math.random() < 0.4 ? 'circle' : Math.random() < 0.7 ? 'square' : 'strip',
        }));

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p) => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation += p.rotationSpeed;

                if (p.y > height) {
                    p.y = -20;
                    p.x = Math.random() * width;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;

                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === 'strip') {
                    ctx.fillRect(-p.size / 4, -p.size, p.size / 2, p.size * 1.8);
                } else {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                }

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Canvas overlay for falling party confetti pops */}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

            {/* Subtle translucent backdrop - keeps app UI clearly visible behind */}
            <div
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity animate-fade-in z-0"
                onClick={handleDismiss}
            />

            {/* Premium Bright Glassmorphic Birthday Card */}
            <div className="relative z-10 w-full max-w-md transform transition-all animate-scale-up">
                <div className="relative bg-white/95 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 text-center shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] border border-white/80 overflow-hidden">
                    
                    {/* Top Decorative Festive Gradient Bar */}
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-rose-500 via-indigo-500 to-amber-400" />

                    {/* Top Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-20"
                        title="Close"
                    >
                        <HiOutlineX className="w-5 h-5" />
                    </button>

                    {/* Animated Gift Icon Badge */}
                    <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 bg-amber-400/25 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 p-0.5 shadow-xl shadow-amber-500/25 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform">
                            <div className="w-full h-full rounded-[14px] bg-amber-500 flex items-center justify-center text-white">
                                <HiGift className="w-10 h-10 animate-bounce" style={{ animationDuration: '2s' }} />
                            </div>
                        </div>
                    </div>

                    {/* Festive Tagline */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold tracking-wider uppercase mb-3">
                        <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
                        <span>Special Celebration Today</span>
                    </div>

                    {/* Main Birthday Title */}
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
                        Happy Birthday! 🎉
                    </h2>
                    
                    {/* Senthil Kumar Name */}
                    <h3 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 tracking-tight mb-5">
                        Senthil Kumar
                    </h3>

                    {/* Bright Warm Wish Box */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-slate-700 text-sm leading-relaxed mb-6 shadow-sm text-center">
                        <p className="font-medium italic text-slate-700">
                            "Wishing you a magnificent birthday filled with joy, good health, great prosperity, and boundless success!"
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleDismiss}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-amber-600 hover:to-amber-500 text-white font-bold text-base shadow-xl shadow-slate-900/20 hover:shadow-amber-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    >
                        <HiHeart className="w-5 h-5 text-rose-500" />
                        <span>Continue</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BirthdayModal;
