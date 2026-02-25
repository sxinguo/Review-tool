-- 复盘工具数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- ============================================
-- 1. 邀请码表
-- ============================================
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                    -- 邀请码（唯一）
  is_used BOOLEAN DEFAULT FALSE,                -- 是否已使用
  used_by UUID REFERENCES auth.users(id),       -- 使用者
  used_at TIMESTAMPTZ,                          -- 使用时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)     -- 创建者（管理员）
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_used ON public.invite_codes(is_used);

-- ============================================
-- 2. 用户扩展表
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  is_guest BOOLEAN DEFAULT FALSE,
  guest_migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- ============================================
-- 3. 复盘事项表
-- ============================================
CREATE TABLE IF NOT EXISTS public.review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  record_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_review_items_user_date ON public.review_items(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_review_items_user_id ON public.review_items(user_id);

-- ============================================
-- 4. 复盘报告缓存表
-- ============================================
CREATE TABLE IF NOT EXISTS public.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('week', 'month')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_period UNIQUE (user_id, report_type, start_date, end_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_review_reports_user_type ON public.review_reports(user_id, report_type);

-- ============================================
-- 5. RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- invite_codes 表策略
CREATE POLICY "Invite codes are readable by all" ON public.invite_codes
  FOR SELECT USING (true);

CREATE POLICY "Invite codes can be updated by service role" ON public.invite_codes
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Invite codes can be inserted by service role" ON public.invite_codes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- user_profiles 表策略
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- review_items 表策略
CREATE POLICY "Users can view own items" ON public.review_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items" ON public.review_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON public.review_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON public.review_items
  FOR DELETE USING (auth.uid() = user_id);

-- review_reports 表策略
CREATE POLICY "Users can view own reports" ON public.review_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.review_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON public.review_reports
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. 函数：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 review_items 表创建触发器
DROP TRIGGER IF EXISTS handle_review_items_updated_at ON public.review_items;
CREATE TRIGGER handle_review_items_updated_at
  BEFORE UPDATE ON public.review_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 7. RPC 函数：检查用户是否存在
-- ============================================
CREATE OR REPLACE FUNCTION public.check_user_exists(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = user_email);
END;
$$;

-- ============================================
-- 8. 初始邀请码（可选，用于测试）
-- ============================================
-- 取消注释以下行来创建测试邀请码
-- INSERT INTO public.invite_codes (code) VALUES ('TEST1234');
-- INSERT INTO public.invite_codes (code) VALUES ('DEMO5678');

-- ============================================
-- 完成！
-- ============================================
-- 执行完此脚本后，请在 Supabase Dashboard 中：
-- 1. 获取项目 URL 和 anon key，填入 .env 文件
-- 2. 获取 service_role key，填入 Vercel 环境变量
-- 3. 在 Authentication > Providers 中启用 Email provider
-- 4. 关闭 Email confirmation（Settings > Auth > Email）以便立即登录
