import { useState } from 'react';
import { Sparkles, User, KeyRound, Lock, ArrowRight, Loader2, ArrowLeft, Check, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useIsMobile } from '../app/components/ui/use-mobile';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, loginAsGuest, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  const supabaseConfigured = isSupabaseConfigured();
  const isMobile = useIsMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入账号名');
      return;
    }

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    if (showInviteCode && !inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(
        username.trim(),
        password.trim(),
        inviteCode.trim() || undefined
      );

      if (result.success) {
        onLoginSuccess?.();
      } else {
        setError(result.error || '登录失败，请重试');
        if (result.needInviteCode) {
          setShowInviteCode(true);
        }
      }
    } catch (err) {
      setError('网络错误，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    onLoginSuccess?.();
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f0f0f0]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 移动端布局
  if (isMobile) {
    return (
      <div
        className="h-screen flex flex-col"
        style={{ background: 'linear-gradient(to bottom right, #faf5ff, #fdf2f8, #eff6ff)' }}
      >
        {/* Header with gradient */}
        <div
          className="px-6 py-12 text-center"
          style={{ background: 'linear-gradient(to right, #a855f7, #ec4899)' }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">南墨笔记</h1>
          </div>
          <p className="text-purple-100 text-sm">
            知行合一，记录成长
          </p>
        </div>

        {/* Login Form */}
        <div className="flex-1 px-6 py-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-purple-100">
            {showLoginForm ? (
              <>
                {/* Login Form Mode */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginForm(false);
                      setError('');
                      setUsername('');
                      setPassword('');
                      setInviteCode('');
                      setShowInviteCode(false);
                    }}
                    className="p-1 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-purple-600" />
                  </button>
                  <h2 className="text-lg font-medium text-purple-900">账号登录</h2>
                </div>

                {!supabaseConfigured ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-lg">
                    云端功能暂未配置，请联系管理员或使用游客模式体验
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Input */}
                    <div>
                      <label className="block text-sm font-medium text-purple-900 mb-2">
                        账号
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="请输入账号（3-20位字母、数字或下划线）"
                          className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <label className="block text-sm font-medium text-purple-900 mb-2">
                        密码
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="请输入密码（至少6位）"
                          className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Invite Code Input */}
                    {showInviteCode && (
                      <div>
                        <label className="block text-sm font-medium text-purple-900 mb-2">
                          邀请码
                        </label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                          <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="请输入邀请码"
                            className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30 uppercase"
                            disabled={isLoading}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          首次注册需要邀请码
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>登录中...</span>
                        </>
                      ) : (
                        <>
                          <span>{showInviteCode ? '注册并登录' : '登录'}</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    {/* Toggle Invite Code Link */}
                    {!showInviteCode && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowInviteCode(true)}
                          className="text-purple-500 hover:text-purple-600 text-sm font-medium transition-colors underline decoration-dotted underline-offset-4"
                        >
                          没有账号？使用邀请码注册
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </>
            ) : (
              <>
                {/* Selection Mode */}
                <div className="space-y-4">
                  {/* Account Login Button */}
                  <button
                    onClick={() => setShowLoginForm(true)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <User className="w-5 h-5" />
                    <span>账号登录</span>
                  </button>

                  {/* Guest Mode Link */}
                  <div className="text-center">
                    <button
                      onClick={handleGuestLogin}
                      className="text-purple-500 hover:text-purple-600 text-sm font-medium transition-colors underline decoration-dotted underline-offset-4"
                    >
                      体验一下
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center mt-4">
                  游客数据仅保存在本地设备
                </p>
              </>
            )}
          </div>

          {/* Features */}
          <div className="mt-8 space-y-3">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
              <h3 className="text-sm font-medium text-purple-900 mb-2">功能特点</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-purple-500">✓</span>
                  每日事项记录与管理
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-500">✓</span>
                  AI 智能复盘分析
                </li>
                <li className="flex items-center gap-2">
                  <span className={supabaseConfigured ? "text-purple-500" : "text-gray-400"}>✓</span>
                  云端同步{!supabaseConfigured && "（需配置）"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 桌面端布局 - 基于 Figma 设计
  return (
    <div className="h-screen w-full bg-[#f0f0f0] flex items-center justify-center px-4">
      {/* 登录卡片 */}
      <div className="w-[860px] bg-white rounded-[20px] shadow-[0px_12px_48px_0px_rgba(0,0,0,0.12)] flex overflow-hidden">
        {/* 左侧品牌区 */}
        <div
          className="w-[360px] flex flex-col justify-between py-12 pl-10"
          style={{
            background: 'linear-gradient(159.86deg, rgb(244, 114, 182) 8.49%, rgb(192, 132, 252) 50%, rgb(124, 58, 237) 91.51%)'
          }}
        >
          {/* 品牌头部 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5.5 h-5.5 text-white" />
              </div>
              <h1 className="text-[22px] font-bold text-white">南墨笔记</h1>
            </div>
            <p className="text-[14px] text-white/70">知行合一，记录成长</p>
          </div>

          {/* 功能特点 */}
          <div className="space-y-4">
            <p className="text-[12px] text-white/60 tracking-wider">功能特点</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-[14px] text-white/90">每日事项记录与管理</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-[14px] text-white/90">AI 智能复盘分析</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-[14px] text-white/90">云端同步（需配置）</span>
              </div>
            </div>
          </div>

          {/* 版权信息 */}
          <p className="text-[12px] text-white/40">© 2026 南墨笔记</p>
        </div>

        {/* 右侧登录区 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[320px]">
            {showLoginForm ? (
              <>
                {/* 登录表单 */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginForm(false);
                      setError('');
                      setUsername('');
                      setPassword('');
                      setInviteCode('');
                      setShowInviteCode(false);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <h2 className="text-[22px] font-semibold text-gray-800">账号登录</h2>
                </div>

                {!supabaseConfigured ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-xl">
                    云端功能暂未配置，请联系管理员或使用游客模式体验
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 用户名 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">账号</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="请输入账号"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50/30"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* 密码 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="请输入密码"
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50/30"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* 邀请码 */}
                    {showInviteCode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">邀请码</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="请输入邀请码"
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50/30 uppercase"
                            disabled={isLoading}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">首次注册需要邀请码</p>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">
                        {error}
                      </div>
                    )}

                    {/* 提交按钮 */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-[46.5px] rounded-[14px] text-white text-[15px] font-medium flex items-center justify-center gap-2 shadow-[0px_4px_16px_0px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(171.73deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>登录中...</span>
                        </>
                      ) : (
                        <>
                          <span>{showInviteCode ? '注册并登录' : '登录'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* 切换邀请码 */}
                    {!showInviteCode && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowInviteCode(true)}
                          className="text-purple-500 hover:text-purple-600 text-sm font-medium transition-colors"
                        >
                          没有账号？使用邀请码注册
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </>
            ) : (
              <>
                {/* 欢迎页面 */}
                <h2 className="text-[22px] font-semibold text-gray-800 mb-2">欢迎回来</h2>
                <p className="text-[14px] text-gray-400 mb-8">登录以同步你的成长记录</p>

                {/* 登录按钮 */}
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="w-full h-[46.5px] rounded-[14px] text-white text-[15px] font-medium flex items-center justify-center gap-2 shadow-[0px_4px_16px_0px_rgba(139,92,246,0.3)] mb-6"
                  style={{
                    background: 'linear-gradient(171.73deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
                  }}
                >
                  <LogIn className="w-[17px] h-[17px]" />
                  <span>账号登录</span>
                </button>

                {/* 分割线 */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[12px] text-gray-300">或者</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* 游客模式 */}
                <button
                  onClick={handleGuestLogin}
                  className="w-full h-[42px] rounded-[14px] border border-dashed border-gray-300 text-gray-400 text-[14px] font-medium hover:bg-gray-50 transition-colors"
                >
                  体验一下
                </button>

                {/* 提示 */}
                <p className="text-[12px] text-gray-300 text-center mt-6">
                  游客数据仅保存在本地设备
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
