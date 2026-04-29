import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach token from localStorage
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — auto-refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshUrl = (import.meta.env.VITE_API_URL || '/api') + '/auth/refresh';
                const res = await axios.post(refreshUrl, {}, { withCredentials: true });
                
                // If the backend returned a new token in the body, save it
                if (res.data?.data?.accessToken) {
                    localStorage.setItem('accessToken', res.data.data.accessToken);
                }

                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
