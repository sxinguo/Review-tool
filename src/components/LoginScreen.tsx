import { useState } from 'react';
import { Sparkles, User, KeyRound, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

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

    // 如果邀请码字段显示且为空，提示用户
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
        // 如果需要邀请码，显示邀请码字段
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
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white">智能复盘工具</h1>
        </div>
        <p className="text-purple-100 text-sm">
          记录成长，见证进步
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

                  {/* Invite Code Input - 条件显示 */}
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
              {/* Selection Mode - Always show this as initial view */}
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
