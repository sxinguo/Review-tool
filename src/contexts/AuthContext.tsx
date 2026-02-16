import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  needsMigration: boolean;
  setNeedsMigration: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_MODE_KEY = 'review-guest-mode';
const GUEST_DATA_KEY = 'review-items';
const USER_DATA_KEY = 'review-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 检查 Supabase 是否配置
        if (!isSupabaseConfigured() || !supabase) {
          // Supabase 未配置，检查是否在游客模式
          const guestMode = localStorage.getItem(GUEST_MODE_KEY);
          if (guestMode === 'true') {
            setIsGuest(true);
          } else {
            // 自动进入游客模式
            setIsGuest(true);
            localStorage.setItem(GUEST_MODE_KEY, 'true');
          }
          setIsLoading(false);
          return;
        }

        // Supabase 已配置，检查现有会话
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsGuest(false);
        } else {
          // 检查是否在游客模式
          const guestMode = localStorage.getItem(GUEST_MODE_KEY);
          if (guestMode === 'true') {
            setIsGuest(true);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // 出错时自动使用游客模式
        setIsGuest(true);
        localStorage.setItem(GUEST_MODE_KEY, 'true');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 监听认证状态变化（仅在 Supabase 配置时）
    let subscription: { unsubscribe: () => void } | undefined;

    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          setIsGuest(false);
          localStorage.removeItem(GUEST_MODE_KEY);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (username: string, inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    // 检查 Supabase 是否配置
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase 未配置，请设置环境变量后重试' };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '登录失败' };
      }

      // 设置 Supabase 会话
      if (data.session && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        setSession(data.session);
        setUser(data.session.user);
        setIsGuest(false);
        localStorage.removeItem(GUEST_MODE_KEY);

        // 检查是否有本地数据需要迁移
        const localData = localStorage.getItem(GUEST_DATA_KEY);
        if (localData) {
          const items = JSON.parse(localData);
          if (items.length > 0) {
            setNeedsMigration(true);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '网络错误，请重试' };
    }
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem(GUEST_MODE_KEY, 'true');
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setSession(null);
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem(GUEST_MODE_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isGuest,
    isLoading,
    isLoggedIn: !!user || isGuest,
    login,
    loginAsGuest,
    logout,
    needsMigration,
    setNeedsMigration,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
