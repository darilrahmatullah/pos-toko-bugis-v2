import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (userData: { name: string; username: string; password: string; role: 'admin' | 'staff' }) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('tobaku_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('tobaku_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Username tidak ditemukan');
        } else {
          console.error('Login error:', error);
          toast.error('Terjadi kesalahan saat login');
        }
        return false;
      }

      // Simple password check - in production, use bcrypt or similar
      const isValidPassword = users.password === password;

      if (users && isValidPassword) {
        const userData: User = {
          id: users.id,
          name: users.name,
          username: users.username,
          role: users.role,
          created_at: users.created_at,
        };

        setUser(userData);
        localStorage.setItem('tobaku_user', JSON.stringify(userData));
        toast.success(`Selamat datang, ${userData.name}!`);
        return true;
      } else {
        toast.error('Password salah');
        return false;
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error('Terjadi kesalahan saat login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: { name: string; username: string; password: string; role: 'admin' | 'staff' }): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', userData.username)
        .single();

      if (existingUser) {
        toast.error('Username sudah digunakan');
        return false;
      }

      // In production, hash the password before storing
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          username: userData.username,
          password: userData.password, // In production, hash this
          role: userData.role
        }])

      if (insertError) {
        console.error('Signup error:', insertError);
        toast.error('Gagal membuat akun');
        return false;
      }

      toast.success('Akun berhasil dibuat! Silakan login.');
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Terjadi kesalahan saat membuat akun');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('tobaku_user');
  };

  const value = {
    user,
    login,
    signup,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};