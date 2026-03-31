import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import Policies from './pages/Policies';
import PolicyDetail from './pages/PolicyDetail';
import Payments from './pages/Payments';
import Claims from './pages/Claims';
import FollowUps from './pages/FollowUps';
import Dealers from './pages/Dealers';
import Reports from './pages/Reports';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full" />
                    <p className="text-sm text-surface-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return null;
    if (user) return <Navigate to="/" replace />;
    return <>{children}</>;
};

const App: React.FC = () => {
    useEffect(() => {
        const handleWheel = () => {
            if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'number') {
                (document.activeElement as HTMLElement).blur();
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            }
                        />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/leads" element={<Leads />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/policies" element={<Policies />} />
                            <Route path="/policies/:id" element={<PolicyDetail />} />
                            <Route path="/payments" element={<Payments />} />
                            <Route path="/claims" element={<Claims />} />
                            <Route path="/follow-ups" element={<FollowUps />} />
                            <Route path="/dealers" element={<Dealers />} />
                            <Route path="/reports" element={<Reports />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 3000,
                        style: {
                            background: '#1e293b',
                            color: '#f1f5f9',
                            fontSize: '14px',
                            borderRadius: '12px',
                            padding: '12px 16px',
                        },
                    }}
                />
            </AuthProvider>
        </QueryClientProvider>
    );
};

export default App;
