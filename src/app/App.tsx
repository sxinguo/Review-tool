import { useState, useEffect } from 'react';
import { Home, User, Plus, Sparkles, ChevronDown } from 'lucide-react';
import WeekView from './components/WeekView';
import Profile from './components/Profile';
import AddItemDialog from './components/AddItemDialog';
import ReviewDialog from './components/ReviewDialog';
import LoginScreen from '../components/LoginScreen';
import AdminPage from '../components/AdminPage';
import { useAuth } from '../contexts/AuthContext';

type Page = 'home' | 'profile' | 'admin';
type ReviewType = 'week' | 'month' | null;

// Admin key from environment or default
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'admin123';

export default function App() {
  const { isLoggedIn, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Check URL for admin path or parameter
    const pathname = window.location.pathname;
    if (pathname === '/admin') {
      return 'admin';
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('admin') === 'true' ? 'admin' : 'home';
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReviewMenu, setShowReviewMenu] = useState(false);
  const [reviewType, setReviewType] = useState<ReviewType>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Update URL when page changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (currentPage === 'admin') {
      url.pathname = '/admin';
      url.searchParams.delete('admin');
    } else {
      url.pathname = '/';
      url.searchParams.delete('admin');
    }
    window.history.replaceState({}, '', url.toString());
  }, [currentPage]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setCurrentPage('home')} />;
  }

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowAddDialog(true);
  };

  const handleReviewSelect = (type: 'week' | 'month') => {
    setReviewType(type);
    setShowReviewMenu(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-gradient-to-r from-purple-400 to-pink-400 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-medium text-white flex items-center gap-2">
              <span>✨</span>
              <span>{currentPage === 'home' ? '每日成长记录' : '我的成长'}</span>
            </h1>
            <p className="text-xs text-purple-100 mt-0.5">
              {currentPage === 'home' ? '记录每一天，见证每一步成长' : '坚持就是胜利'}
            </p>
          </div>

          {currentPage === 'home' && (
            <div className="relative">
              <button
                onClick={() => setShowReviewMenu(!showReviewMenu)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>智能复盘</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showReviewMenu ? 'rotate-180' : ''}`} />
              </button>

              {showReviewMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowReviewMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl overflow-hidden z-20 border border-purple-100">
                    <button
                      onClick={() => handleReviewSelect('week')}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 active:bg-purple-100 transition-colors"
                    >
                      📅 周复盘
                    </button>
                    <button
                      onClick={() => handleReviewSelect('month')}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-purple-50 active:bg-purple-100 transition-colors"
                    >
                      📊 月复盘
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden">
        {currentPage === 'home' ? (
          <WeekView onDateClick={handleDateClick} />
        ) : currentPage === 'admin' ? (
          <AdminPage
            onBack={() => setCurrentPage('profile')}
            adminKey={ADMIN_KEY}
          />
        ) : (
          <Profile onEnterAdmin={() => setCurrentPage('admin')} />
        )}
      </main>

      {/* 底部导航栏 - 管理页面不显示 */}
      {currentPage !== 'admin' && (
      <nav className="bg-white border-t border-purple-100 px-6 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentPage('home')}
          className={`flex flex-col items-center py-2 px-4 transition-colors ${
            currentPage === 'home' ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">首页</span>
        </button>

        <button
          onClick={() => setShowAddDialog(true)}
          className="flex flex-col items-center py-2 px-4"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center -mt-6 shadow-lg">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs mt-1 text-purple-500">添加</span>
        </button>

        <button
          onClick={() => setCurrentPage('profile')}
          className={`flex flex-col items-center py-2 px-4 transition-colors ${
            currentPage === 'profile' ? 'text-purple-500' : 'text-gray-400'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs mt-1">我的</span>
        </button>
      </nav>
      )}

      {/* 添加事项弹窗 */}
      <AddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        initialDate={selectedDate || undefined}
      />

      {/* 复盘弹窗 */}
      <ReviewDialog
        isOpen={reviewType !== null}
        onClose={() => setReviewType(null)}
        type={reviewType || 'week'}
      />
    </div>
  );
}
