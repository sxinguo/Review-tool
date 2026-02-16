import { useState, useEffect, useCallback } from 'react';
import { Calendar, FileText, TrendingUp, LogOut, Cloud, CloudOff } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { dataService, Stats } from '../../lib/data-service';
import MigrationDialog from '../../components/MigrationDialog';

export default function Profile() {
  const { user, isGuest, logout, needsMigration } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalDays: 0,
    totalItems: 0,
    firstRecordDate: null,
  });
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const fetchedStats = await dataService.getStats();
      setStats(fetchedStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();

    const handleStorageChange = () => {
      loadStats();
    };

    window.addEventListener('storage-update', handleStorageChange);
    return () => window.removeEventListener('storage-update', handleStorageChange);
  }, [loadStats]);

  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      await logout();
    }
  };

  const handleMigrate = () => {
    setShowMigrationDialog(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 用户信息卡片 */}
      <div className="bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-2xl">{isGuest ? '👤' : '👤'}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-white">
                {isGuest ? '游客模式' : (user?.user_metadata?.username || '我的复盘')}
              </h2>
              {isGuest && (
                <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full">
                  游客
                </span>
              )}
            </div>
            <p className="text-purple-100 text-sm mt-1 flex items-center gap-1">
              {isGuest ? (
                <>
                  <CloudOff className="w-3 h-3" />
                  数据仅保存在本地
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3" />
                  {stats.firstRecordDate
                    ? `开始记录于 ${format(new Date(stats.firstRecordDate), 'yyyy年M月d日', { locale: zhCN })}`
                    : '还没有开始记录'}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="px-4 py-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md overflow-hidden border border-purple-100">
          <div className="grid grid-cols-2 divide-x divide-purple-100">
            {/* 记录天数 */}
            <div className="px-6 py-5 text-center bg-gradient-to-br from-purple-50 to-transparent">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-purple-900 mb-1">
                {stats.totalDays}
              </div>
              <div className="text-sm text-purple-600">已记录天数</div>
            </div>

            {/* 总事项数 */}
            <div className="px-6 py-5 text-center bg-gradient-to-br from-pink-50 to-transparent">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-pink-600" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-pink-900 mb-1">
                {stats.totalItems}
              </div>
              <div className="text-sm text-pink-600">总事项数</div>
            </div>
          </div>
        </div>

        {/* 激励卡片 */}
        <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 border border-purple-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-purple-900 mb-1">保持记录习惯</h3>
              <p className="text-sm text-purple-700 leading-relaxed">
                {stats.totalDays === 0
                  ? '开始记录你的第一条事项,养成复盘的好习惯！'
                  : stats.totalDays < 7
                  ? '很棒！继续坚持，养成每日记录的好习惯。'
                  : stats.totalDays < 30
                  ? `已经坚持 ${stats.totalDays} 天了，继续保持！`
                  : `太厉害了！已经坚持 ${stats.totalDays} 天，复盘让你更优秀。`
                }
              </p>
            </div>
          </div>
        </div>

        {/* 账户操作 */}
        <div className="mt-6 space-y-3">
          {isGuest && (
            <button
              onClick={handleMigrate}
              className="w-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 py-4 rounded-xl font-medium hover:from-purple-150 hover:to-pink-150 transition-all flex items-center justify-center gap-2 border border-purple-200"
            >
              <Cloud className="w-5 h-5" />
              <span>登录同步数据到云端</span>
            </button>
          )}

          {!isGuest && needsMigration && (
            <button
              onClick={handleMigrate}
              className="w-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 py-4 rounded-xl font-medium hover:from-amber-150 hover:to-orange-150 transition-all flex items-center justify-center gap-2 border border-amber-200"
            >
              <Cloud className="w-5 h-5" />
              <span>迁移本地数据到云端</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full bg-white text-gray-600 py-4 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 border border-gray-200"
          >
            <LogOut className="w-5 h-5" />
            <span>{isGuest ? '退出游客模式' : '退出登录'}</span>
          </button>
        </div>

        {/* 功能提示 */}
        <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-medium text-amber-900 mb-2">💡 使用提示</h4>
          <ul className="space-y-1 text-sm text-amber-800">
            <li>• 每天记录工作事项，定期复盘总结</li>
            <li>• 点击日期可快速切换到指定周</li>
            <li>• 坚持记录，让进步看得见</li>
            {isGuest && <li>• 登录后可同步数据到云端</li>}
          </ul>
        </div>
      </div>

      {/* 数据迁移弹窗 */}
      <MigrationDialog
        isOpen={showMigrationDialog}
        onClose={() => setShowMigrationDialog(false)}
      />
    </div>
  );
}
