import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Key,
  Users,
  Settings,
  LayoutDashboard,
  ChevronRight,
  Plus,
  Search,
  Download,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InviteCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

interface AdminPageProps {
  onBack: () => void;
  adminKey: string;
}

type MenuItem = 'dashboard' | 'invites' | 'users' | 'settings';
type FilterStatus = 'all' | 'used' | 'unused';

// Generate random code
function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function AdminPage({ onBack, adminKey }: AdminPageProps) {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [activeMenu, setActiveMenu] = useState<MenuItem>('invites');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Verify admin key
  const handleAdminLogin = () => {
    if (inputKey === adminKey) {
      setIsAdminAuthenticated(true);
      loadCodes();
    } else {
      setError('管理密码错误');
    }
  };

  // Load existing codes
  const loadCodes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        setError('Supabase 未配置');
        return;
      }

      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (err) {
      console.error('Error loading codes:', err);
      setError('加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadCodes();
    }
  }, [isAdminAuthenticated]);

  // Generate new codes
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!supabase) return;

      for (let i = 0; i < generateCount; i++) {
        let attempts = 0;
        let success = false;

        while (!success && attempts < 10) {
          const code = generateRandomCode(8);
          const { error } = await supabase
            .from('invite_codes')
            .insert({ code });

          if (!error) {
            success = true;
          } else {
            attempts++;
          }
        }
      }

      await loadCodes();
    } catch (err) {
      console.error('Error generating codes:', err);
      setError('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy code
  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Delete code
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个邀请码吗？')) return;

    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCodes(codes.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting code:', err);
      setError('删除失败');
    }
  };

  // Filter codes
  const filteredCodes = codes.filter(code => {
    // 搜索筛选
    const matchSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase());
    // 状态筛选
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'used' && code.is_used) ||
      (filterStatus === 'unused' && !code.is_used);
    return matchSearch && matchStatus;
  });

  // 导出 Excel
  const handleExport = () => {
    if (filteredCodes.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    // 生成 CSV 内容
    const headers = ['邀请码', '状态', '创建时间', '使用时间'];
    const rows = filteredCodes.map(code => [
      code.code,
      code.is_used ? '已使用' : '未使用',
      new Date(code.created_at).toLocaleString('zh-CN'),
      code.used_at ? new Date(code.used_at).toLocaleString('zh-CN') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // 添加 BOM 以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `邀请码_${filterStatus === 'all' ? '全部' : filterStatus === 'used' ? '已使用' : '未使用'}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const unusedCount = codes.filter(c => !c.is_used).length;
  const usedCount = codes.filter(c => c.is_used).length;

  // Login screen
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">管理后台</h1>
            <p className="text-gray-500 mt-2">请输入管理密码登录</p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="管理密码"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleAdminLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              登录
            </button>
            <button
              onClick={onBack}
              className="w-full text-gray-500 py-2 hover:text-gray-700 transition-colors"
            >
              返回前台
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main admin layout
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        {/* Menu */}
        <nav className="flex-1 p-4 pt-6">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveMenu('invites')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeMenu === 'invites'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Key className="w-5 h-5" />
                <span>邀请码管理</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeMenu === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>用户管理</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeMenu === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>系统设置</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            </li>
          </ul>
        </nav>

        {/* Back button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回前台</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Content */}
        <div className="flex-1 p-8 overflow-auto">
          {activeMenu === 'invites' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Key className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">未使用</p>
                      <p className="text-2xl font-bold text-gray-800">{unusedCount}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Key className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">已使用</p>
                      <p className="text-2xl font-bold text-gray-800">{usedCount}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Key className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">总计</p>
                      <p className="text-2xl font-bold text-gray-800">{codes.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="搜索邀请码..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 状态筛选 */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        filterStatus === 'all'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setFilterStatus('unused')}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        filterStatus === 'unused'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      未使用
                    </button>
                    <button
                      onClick={() => setFilterStatus('used')}
                      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                        filterStatus === 'used'
                          ? 'bg-white text-gray-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      已使用
                    </button>
                  </div>

                  {/* 导出按钮 */}
                  <button
                    onClick={handleExport}
                    disabled={filteredCodes.length === 0}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>导出</span>
                    <span className="text-xs text-gray-400">({filteredCodes.length})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={generateCount}
                      onChange={(e) => setGenerateCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">个</span>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    <span>生成邀请码</span>
                  </button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">邀请码</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">状态</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">创建时间</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">使用时间</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>加载中...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCodes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          {searchTerm ? '未找到匹配的邀请码' : '暂无邀请码'}
                        </td>
                      </tr>
                    ) : (
                      filteredCodes.map((code) => (
                        <tr key={code.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {code.code}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            {code.is_used ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                已使用
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                未使用
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(code.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {code.used_at ? new Date(code.used_at).toLocaleString('zh-CN') : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCopy(code.code, code.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="复制"
                              >
                                {copiedId === code.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              {!code.is_used && (
                                <button
                                  onClick={() => handleDelete(code.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'users' && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500">用户管理</h3>
              <p className="text-gray-400 mt-2">功能开发中...</p>
            </div>
          )}

          {activeMenu === 'settings' && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500">系统设置</h3>
              <p className="text-gray-400 mt-2">功能开发中...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
