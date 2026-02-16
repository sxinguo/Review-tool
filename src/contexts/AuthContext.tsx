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
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase 未配置，请设置环境变量后重试' };
    }

    try {
      // 验证用户名格式
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return { success: false, error: '账号名格式不正确（3-20位字母、数字或下划线）' };
      }

      const email = `${username.toLowerCase()}@review.app`;

      // 首先尝试登录（用户已存在的情况）
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: inviteCode,
      });

      if (!signInError && signInData.session) {
        // 登录成功
        setSession(signInData.session);
        setUser(signInData.session.user);
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

        return { success: true };
      }

      // 登录失败，尝试注册新用户
      // 首先验证邀请码
      const { data: inviteCodes, error: inviteCodeError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', inviteCode.toUpperCase())
        .eq('is_used', false);

      if (inviteCodeError) {
        console.error('Invite code query error:', inviteCodeError);
        return { success: false, error: '验证邀请码时出错' };
      }

      if (!inviteCodes || inviteCodes.length === 0) {
        return { success: false, error: '邀请码无效或已被使用' };
      }

      const inviteCodeData = inviteCodes[0];

      // 创建新用户
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: inviteCode,
        options: {
          data: {
            username,
          },
          emailRedirectTo: undefined,
        },
      });

      if (signUpError) {
        return { success: false, error: signUpError.message || '注册失败' };
      }

      if (!signUpData.user) {
        return { success: false, error: '注册失败' };
      }

      // 用户资料由数据库触发器自动创建

      // 标记邀请码已使用
      await supabase
        .from('invite_codes')
        .update({
          is_used: true,
          used_by: signUpData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', inviteCodeData.id);

      // 设置会话
      if (signUpData.session) {
        setSession(signUpData.session);
        setUser(signUpData.session.user);
        setIsGuest(false);
        localStorage.removeItem(GUEST_MODE_KEY);
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
