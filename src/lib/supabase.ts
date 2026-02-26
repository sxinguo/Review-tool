import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端（仅在配置了 URL 时才有效）
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // 会话持久化到 localStorage
      persistSession: true,
      // 自动刷新 token
      autoRefreshToken: true,
      // 检测并恢复会话
      detectSessionInUrl: true,
      // 存储类型
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
}

// 检查是否配置了 Supabase
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export { supabase };
export type { User, Session } from '@supabase/supabase-js';
