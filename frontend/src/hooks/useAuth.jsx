import { useState, useEffect, createContext, useContext } from 'react';
import { authAPI } from '../utils/api';
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      authAPI.getMe()
        .then(response => {
          setUserState(response.data.user);
          setUser(response.data.user);
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;

      setToken(token);
      setUser(user);
      setUserState(user);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login mislukt'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;

      setToken(token);
      setUser(user);
      setUserState(user);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registratie mislukt'
      };
    }
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUserState(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    hasRole: (roles) => {
      if (!user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(user.role);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};