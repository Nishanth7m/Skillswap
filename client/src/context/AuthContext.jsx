import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure base URL for Axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://skillswap-backend-769621790187.us-central1.run.app';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));

  // Sync token changes
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  // Request interceptor to add authorization header
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [accessToken]);

  // Response interceptor to handle token refresh automatically
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const localRefreshToken = localStorage.getItem('refreshToken');

          if (localRefreshToken) {
            try {
              // Attempt to refresh token (runs without auth header)
              const response = await axios.post('/api/auth/refresh', {
                refreshToken: localRefreshToken,
              }, {
                headers: { Authorization: '' } // Clear auth header for refresh request
              });

              if (response.data?.success) {
                const { accessToken: newAccess, refreshToken: newRefresh } = response.data.tokens;
                
                // Store new tokens
                setAccessToken(newAccess);
                localStorage.setItem('refreshToken', newRefresh);
                
                // Update header in the original request and retry it
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              // Refresh failed, log user out
              logout();
              return Promise.reject(refreshError);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check login status on startup
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        try {
          const res = await axios.get('/api/users/profile');
          if (res.data?.success) {
            setUser(res.data.data);
          } else {
            logout();
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const register = async (name, email, password) => {
    const res = await axios.post('/api/auth/register', { name, email, password });
    if (res.data?.success) {
      setUser(res.data.data);
      setAccessToken(res.data.tokens.accessToken);
      localStorage.setItem('refreshToken', res.data.tokens.refreshToken);
    }
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    if (res.data?.success) {
      setUser(res.data.data);
      setAccessToken(res.data.tokens.accessToken);
      localStorage.setItem('refreshToken', res.data.tokens.refreshToken);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await axios.post('/api/auth/logout', {});
      }
    } catch (err) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
    }
  };

  const updateProfile = async (profileData) => {
    const res = await axios.put('/api/users/profile', profileData);
    if (res.data?.success) {
      setUser(res.data.data);
    }
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
