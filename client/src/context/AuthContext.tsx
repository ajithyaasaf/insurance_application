import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'agent' | 'staff';
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, role?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data.data);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { user, accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        setUser(user);
    };

    const register = async (name: string, email: string, password: string, role?: string) => {
        const res = await api.post('/auth/register', { name, email, password, role });
        const { user, accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        setUser(user);
    };

    const logout = async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('accessToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
