import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronUp, ChevronDown, Calendar, Sparkles, Plus, Home, Battery, Trash2, Eye, User, CalendarDays, ListChecks, LogOut, Lightbulb, Flame, Search, X } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import DatePickerDialog from '../DatePickerDialog';
import DesktopAddItemDialog from '../DesktopAddItemDialog';
import ReviewDialog from '../ReviewDialog';
import { dataService, ReviewItem, Stats } from '../../../lib/data-service';
import { useAuth } from '../../../contexts/AuthContext';

type PageView = 'home' | 'profile';

interface DesktopLayoutProps {
  onEnterAdmin?: () => void;
}

// 分类配置
const CATEGORY_CONFIG = {
  basic: {
    prefix: '【基础】',
    label: '基础',
    icon: Home,
    colorClass: 'bg-blue-50',
    borderColor: 'border-l-blue-400',
    iconColor: 'text-blue-500',
    labelColor: 'text-blue-600',
    order: 1,
  },
  energy: {
    prefix: '【蓄能】',
    label: '蓄能',
    icon: Battery,
    colorClass: 'bg-green-50',
    borderColor: 'border-l-green-400',
    iconColor: 'text-green-500',
    labelColor: 'text-green-600',
    order: 2,
  },
  create: {
    prefix: '【创造】',
    label: '创造',
    icon: Sparkles,
    colorClass: 'bg-purple-50',
    borderColor: 'border-l-purple-400',
    iconColor: 'text-purple-500',
    labelColor: 'text-purple-600',
    order: 3,
  },
  other: {
    prefix: '',
    label: '',
    icon: null,
    colorClass: 'bg-gray-50',
    borderColor: 'border-l-gray-300',
    iconColor: 'text-gray-500',
    labelColor: 'text-gray-500',
    order: 4,
  },
};

type CategoryKey = keyof typeof CATEGORY_CONFIG;

// 解析事项分类
function parseItemCategory(content: string): { category: CategoryKey; displayContent: string } {
  if (content.startsWith('【基础】')) {
    return { category: 'basic', displayContent: content.replace('【基础】', '').trim() };
  }
  if (content.startsWith('【蓄能】')) {
    return { category: 'energy', displayContent: content.replace('【蓄能】', '').trim() };
  }
  if (content.startsWith('【创造】')) {
    return { category: 'create', displayContent: content.replace('【创造】', '').trim() };
  }
  return { category: 'other', displayContent: content };
}

export default function DesktopLayout({ onEnterAdmin }: DesktopLayoutProps) {
  const { user, isGuest, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalDays: 0,
    totalItems: 0,
    firstRecordDate: null,
  });
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [time, setTime] = useState(new Date());

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        const fetchedStats = await dataService.getStats();
        setStats(fetchedStats);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();

    const handleStorageChange = () => loadStats();
    window.addEventListener('storage-update', handleStorageChange);
    return () => window.removeEventListener('storage-update', handleStorageChange);
  }, []);

  // Load items from DataService
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedItems = await dataService.getItems();
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();

    const handleStorageChange = () => {
      loadItems();
    };

    window.addEventListener('storage-update', handleStorageChange);
    return () => window.removeEventListener('storage-update', handleStorageChange);
  }, [loadItems]);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleDateSelect = (date: Date) => {
    setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    setShowDatePicker(false);
  };

  // 切换某天的展开状态
  const toggleDayExpand = (dateStr: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  // 获取某天的事项
  const getItemsForDate = (date: Date) => {
    let dayItems = items.filter(item => {
      const itemDate = parseISO(item.date);
      return isSameDay(itemDate, date);
    });

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      dayItems = dayItems.filter(item =>
        item.content.toLowerCase().includes(query)
      );
    }

    // 分类筛选
    if (activeCategory !== 'all') {
      dayItems = dayItems.filter(item => {
        const { category } = parseItemCategory(item.content);
        return category === activeCategory;
      });
    }

    // 排序
    return dayItems.sort((a, b) => {
      const categoryA = parseItemCategory(a.content).category;
      const categoryB = parseItemCategory(b.content).category;
      const categoryOrder = CATEGORY_CONFIG[categoryA].order - CATEGORY_CONFIG[categoryB].order;
      if (categoryOrder !== 0) return categoryOrder;
      return a.createdAt - b.createdAt;
    });
  };

  // 删除事项
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('确定要删除这条记录吗？')) return;

    try {
      await dataService.deleteItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('删除失败，请重试');
    }
  };

  // 快速保存
  const handleQuickSave = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const promises: Promise<ReviewItem>[] = [];

    Object.entries(quickInputs).forEach(([category, content]) => {
      if (content.trim()) {
        const prefix = CATEGORY_CONFIG[category as CategoryKey]?.prefix || '';
        promises.push(dataService.addItem(prefix + content.trim(), today));
      }
    });

    if (promises.length === 0) return;

    try {
      await Promise.all(promises);
      setQuickInputs({ basic: '', energy: '', create: '' });
      loadItems();
      window.dispatchEvent(new Event('storage-update'));
    } catch (error) {
      console.error('Error saving items:', error);
      alert('保存失败，请重试');
    }
  };

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  // 快速输入状态
  const [quickInputs, setQuickInputs] = useState({
    basic: '',
    energy: '',
    create: '',
  });

  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // 时钟指针角度
  const hourDeg = (hours % 12) * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6;
  const secondDeg = seconds * 6;

  const categories = [
    { key: 'basic', label: '基础', icon: Home, color: '#3b82f6' },
    { key: 'energy', label: '蓄能', icon: Battery, color: '#22c55e' },
    { key: 'create', label: '创造', icon: Sparkles, color: '#a855f7' },
  ];

  // 计算分类统计数据
  const categoryStats = categories.map(cat => {
    const count = items.filter(item => parseItemCategory(item.content).category === cat.key).length;
    const percentage = stats.totalItems > 0 ? Math.round((count / stats.totalItems) * 100) : 0;
    return { ...cat, count, percentage };
  });

  // 计算坚持天数
  const daysSinceStart = stats.firstRecordDate
    ? differenceInDays(new Date(), new Date(stats.firstRecordDate)) + 1
    : 0;

  // 渲染事项卡片
  const renderItemCard = (item: ReviewItem) => {
    const { category, displayContent } = parseItemCategory(item.content);
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;

    return (
      <div
        key={item.id}
        className={`${config.colorClass} ${config.borderColor} border-l-[3px] rounded-xl px-4 py-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow`}
        onClick={() => setEditingItem(item)}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className={`w-3 h-3 ${config.iconColor}`} />}
            <span className={`text-[12px] font-medium ${config.labelColor}`}>{config.label}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteItem(item.id);
            }}
            className="flex items-center gap-1 text-gray-300 hover:text-red-400"
          >
            <Trash2 className="w-3 h-3" />
            <span className="text-[12px]">删除</span>
          </button>
        </div>
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#f0f0f0] flex items-center justify-center px-4 py-0">
      {/* 内容容器 - 固定宽度，高度撑满屏幕，圆角阴影 */}
      <div className="w-[960px] h-full bg-white rounded-2xl shadow-[0px_8px_40px_0px_rgba(0,0,0,0.1)] flex overflow-hidden my-0">
        {/* 左侧边栏 */}
        <div className="w-[208px] h-full bg-white border-r border-black/10 flex flex-col">
          {/* 顶部品牌区 */}
          <div
            className="flex items-center gap-2.5 px-4 py-4"
            style={{
              background: 'linear-gradient(162.9deg, rgb(244, 114, 182) 0%, rgb(192, 132, 252) 55%, rgb(124, 58, 237) 100%)'
            }}
          >
            <div className="w-[18px] h-[18px] flex items-center justify-center">
              <span className="text-white text-sm">✨</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">复盘，只为更快成长</h1>
              <p className="text-white/65 text-[10px]">记录成长，见证每一步</p>
            </div>
          </div>

          {/* 统计区域 */}
          <div className="flex items-center gap-4 px-4 py-4 border-b border-gray-200/60">
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{stats.totalDays}</div>
              <div className="text-[11px] text-gray-400">记录天</div>
            </div>
            <div className="w-px h-7 bg-gray-200" />
            <div className="text-center">
              <div className="text-xl font-bold text-pink-500">{stats.totalItems}</div>
              <div className="text-[11px] text-gray-400">总事项</div>
            </div>
          </div>

          {/* 时钟区域 */}
          <div className="flex flex-col items-center py-3 border-b border-gray-200/60">
            {/* 模拟时钟 */}
            <div className="w-[76px] h-[76px] rounded-full bg-white shadow-lg shadow-purple-500/20 relative mb-2">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30 - 90) * (Math.PI / 180);
                  const x1 = 50 + 40 * Math.cos(angle);
                  const y1 = 50 + 40 * Math.sin(angle);
                  const x2 = 50 + 44 * Math.cos(angle);
                  const y2 = 50 + 44 * Math.sin(angle);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="2" />
                  );
                })}
                <line
                  x1="50" y1="50"
                  x2={50 + 22 * Math.cos((hourDeg - 90) * (Math.PI / 180))}
                  y2={50 + 22 * Math.sin((hourDeg - 90) * (Math.PI / 180))}
                  stroke="#1f2937" strokeWidth="3" strokeLinecap="round"
                />
                <line
                  x1="50" y1="50"
                  x2={50 + 30 * Math.cos((minuteDeg - 90) * (Math.PI / 180))}
                  y2={50 + 30 * Math.sin((minuteDeg - 90) * (Math.PI / 180))}
                  stroke="#374151" strokeWidth="2" strokeLinecap="round"
                />
                <line
                  x1="50" y1="50"
                  x2={50 + 35 * Math.cos((secondDeg - 90) * (Math.PI / 180))}
                  y2={50 + 35 * Math.sin((secondDeg - 90) * (Math.PI / 180))}
                  stroke="#a855f7" strokeWidth="1" strokeLinecap="round"
                />
                <circle cx="50" cy="50" r="3" fill="#a855f7" />
              </svg>
            </div>
            {/* 数字时间 */}
            <div className="text-lg font-bold tracking-wide text-gray-900">
              {format(time, 'HH:mm:ss')}
            </div>
            {/* 日期 */}
            <div className="text-[11px] text-gray-400">
              {format(time, 'yyyy年M月d日 EEEE', { locale: zhCN })}
            </div>
          </div>

          {/* 日期选择器 */}
          <div className="px-3 py-2.5 border-b border-gray-200/60">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevWeek}
                className="w-[22px] h-[22px] flex items-center justify-center rounded-[10px] hover:bg-gray-50"
              >
                <ChevronUp className="w-3 h-3 text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                  setShowDatePicker(true);
                }}
                className="h-[24px] px-2 rounded-full flex items-center gap-1"
                style={{
                  background: 'linear-gradient(170.03deg, rgb(252, 231, 243) 0%, rgb(237, 233, 254) 100%)'
                }}
              >
                <span className="text-[11px]">📅</span>
                <span className="text-[11px] font-medium text-purple-600">
                  {format(currentWeekStart, 'M月d日', { locale: zhCN })} - {format(weekEnd, 'M月d日', { locale: zhCN })}
                </span>
              </button>
              <button
                onClick={handleNextWeek}
                className="w-[22px] h-[22px] flex items-center justify-center rounded-[10px] hover:bg-gray-50"
              >
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>

          {/* 导航菜单 */}
          <div className="px-2 py-3 border-b border-gray-200/60">
            <button
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] ${
                currentPage === 'home' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-500'
              }`}
              onClick={() => setCurrentPage('home')}
            >
              <Home className="w-4 h-4" />
              <span>全部事项</span>
            </button>
            <button
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] ${
                currentPage === 'profile' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-500'
              }`}
              onClick={() => setCurrentPage('profile')}
            >
              <User className="w-4 h-4" />
              <span>我的</span>
            </button>
          </div>

          {/* 分类标签 */}
          <div className="flex-1 px-2 py-3 overflow-y-auto">
            <div className="text-[11px] text-gray-400 font-medium px-3 mb-2">分类标签</div>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(isActive ? 'all' : cat.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] transition-colors ${
                    isActive ? 'bg-gray-50' : ''
                  }`}
                  style={{ color: isActive ? cat.color : '#4a5565' }}
                >
                  <Icon className="w-3 h-3" />
                  <span className="font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* 智能复盘按钮 */}
          <div className="px-3 py-3">
            <button
              onClick={() => setShowReviewDialog(true)}
              className="w-full h-[35px] rounded-xl flex items-center justify-center gap-2 text-white text-[13px] font-medium"
              style={{
                background: 'linear-gradient(169.04deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>智能复盘</span>
            </button>
          </div>

          {/* 底部用户信息 */}
          <div className="px-4 py-3 border-t border-gray-200/60 flex items-center gap-2.5 bg-gray-50">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
              }}
            >
              <User className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-gray-700 truncate">
                {isGuest ? '游客' : (user?.user_metadata?.username || '用户')}
              </div>
              <div className="text-[10px] text-gray-400 truncate">坚持就是胜利</div>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {currentPage === 'profile' ? (
            /* 个人中心页面 */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 用户头部 */}
              <div
                className="h-[65px] px-[18px] flex items-center gap-4"
                style={{
                  background: 'linear-gradient(178.16deg, rgb(244, 114, 182) 8.49%, rgb(192, 132, 252) 54.15%, rgb(124, 58, 237) 91.51%)'
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                >
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-[18px] font-semibold text-white">
                    {isGuest ? '游客' : (user?.user_metadata?.username || '用户')}
                  </div>
                  <div className="text-[13px] text-white/70 flex items-center gap-1.5">
                    <span>☁</span>
                    <span>
                      开始记录于 {stats.firstRecordDate
                        ? format(new Date(stats.firstRecordDate), 'yyyy年M月d日', { locale: zhCN })
                        : '暂无记录'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 个人中心内容 */}
              <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                <div className="space-y-4">
                  {/* 统计卡片 */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex">
                      {/* 记录天数 */}
                      <div className="flex-1 py-6 border-r border-gray-100">
                        <div className="flex justify-center mb-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="text-center text-[28px] font-bold text-purple-600">
                          {stats.totalDays}
                        </div>
                        <div className="text-center text-[13px] text-purple-400 mt-1">
                          已记录天数
                        </div>
                      </div>
                      {/* 总事项数 */}
                      <div className="flex-1 py-6">
                        <div className="flex justify-center mb-3">
                          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                            <ListChecks className="w-5 h-5 text-pink-500" />
                          </div>
                        </div>
                        <div className="text-center text-[28px] font-bold text-pink-500">
                          {stats.totalItems}
                        </div>
                        <div className="text-center text-[13px] text-pink-400 mt-1">
                          总事项数
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 保持习惯卡片 */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
                      }}
                    >
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[15px] font-medium text-gray-800">保持记录习惯</div>
                      <div className="text-[13px] text-purple-600 mt-0.5">
                        已经坚持 <span className="font-semibold">{daysSinceStart}</span> 天了，继续保持！
                      </div>
                    </div>
                  </div>

                  {/* 分类统计卡片 */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                    <div className="text-[14px] font-medium text-gray-700 mb-4">事项分类统计</div>
                    <div className="space-y-4">
                      {categoryStats.map((cat) => (
                        <div key={cat.key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                              <span className="text-[13px] text-gray-600">{cat.label}</span>
                            </div>
                            <span className="text-[12px] font-medium" style={{ color: cat.color }}>
                              {cat.count} 条 · {cat.percentage}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.color
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 退出登录按钮 */}
                  <button
                    onClick={() => {
                      if (window.confirm('确定要退出登录吗？')) {
                        logout();
                      }
                    }}
                    className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm py-3.5 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-[14px] font-medium">退出登录</span>
                  </button>

                  {/* 使用提示 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span className="text-[13px] font-medium text-amber-700">使用提示</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[13px] text-amber-700 leading-relaxed">
                        • 每天记录工作事项，定期复盘总结
                      </div>
                      <div className="text-[13px] text-amber-700 leading-relaxed">
                        • 点击日期可快速切换到指定周
                      </div>
                      <div className="text-[13px] text-amber-700 leading-relaxed">
                        • 坚持记录，让进步看得见
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 首页内容 */
            <div className="flex-1 overflow-y-auto">
              <div className="p-5">
              {/* 搜索框 */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索事项..."
                  className="w-full h-10 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* 快速输入区 */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-5 overflow-hidden">
                {/* 基础 */}
                <div className="border-b border-gray-100 flex items-center px-4 py-3">
                  <div className="bg-blue-50 text-blue-600 text-[12px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Home className="w-3 h-3" />
                    <span>基础</span>
                  </div>
                  <input
                    type="text"
                    value={quickInputs.basic}
                    onChange={(e) => setQuickInputs(prev => ({ ...prev, basic: e.target.value }))}
                    placeholder="今天的基础事项..."
                    className="flex-1 px-3 text-[13px] text-gray-700 placeholder-gray-400 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleQuickSave();
                    }}
                  />
                </div>

                {/* 蓄能 */}
                <div className="border-b border-gray-100 flex items-center px-4 py-3">
                  <div className="bg-green-50 text-green-600 text-[12px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Battery className="w-3 h-3" />
                    <span>蓄能</span>
                  </div>
                  <input
                    type="text"
                    value={quickInputs.energy}
                    onChange={(e) => setQuickInputs(prev => ({ ...prev, energy: e.target.value }))}
                    placeholder="今天的蓄能事项..."
                    className="flex-1 px-3 text-[13px] text-gray-700 placeholder-gray-400 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleQuickSave();
                    }}
                  />
                </div>

                {/* 创造 */}
                <div className="border-b border-gray-100 flex items-center px-4 py-3">
                  <div className="bg-purple-50 text-purple-600 text-[12px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>创造</span>
                  </div>
                  <input
                    type="text"
                    value={quickInputs.create}
                    onChange={(e) => setQuickInputs(prev => ({ ...prev, create: e.target.value }))}
                    placeholder="今天的创造事项..."
                    className="flex-1 px-3 text-[13px] text-gray-700 placeholder-gray-400 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleQuickSave();
                    }}
                  />
                </div>

                {/* 底部操作栏 */}
                <div className="bg-gray-50/50 border-t border-gray-100 flex items-center justify-end px-4 py-2.5">
                  <span className="text-[11px] text-gray-300 mr-3">Ctrl+Enter 快速保存</span>
                  <button
                    onClick={handleQuickSave}
                    disabled={!quickInputs.basic && !quickInputs.energy && !quickInputs.create}
                    className="h-8 px-4 rounded-[10px] flex items-center gap-1.5 text-white text-[13px] font-medium disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(155.14deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>保存</span>
                  </button>
                </div>
              </div>

              {/* 周视图 */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-5">
                  {weekDays.map((day) => {
                    const dayItems = getItemsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isExpanded = expandedDays.has(dateStr);

                    // 往期有记录的折叠
                    const shouldCollapse = isPast && dayItems.length > 0 && !isExpanded && !isToday;

                    return (
                      <div key={dateStr} className="space-y-2.5">
                        {/* 日期标题 */}
                        <div
                          className="flex items-center justify-between border-b border-gray-100 pb-1.5 cursor-pointer"
                          onClick={() => {
                            if (isPast && dayItems.length > 0) {
                              toggleDayExpand(dateStr);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[14px] ${isToday ? 'font-semibold text-purple-700' : 'font-medium text-gray-700'}`}>
                              {format(day, 'M月d日', { locale: zhCN })}
                            </span>
                            <span className="text-[13px] text-gray-400">
                              {format(day, 'E', { locale: zhCN })}
                            </span>
                            {isToday && (
                              <span
                                className="text-[11px] text-white px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'linear-gradient(151.65deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
                                }}
                              >
                                今天
                              </span>
                            )}
                            {dayItems.length > 0 && (
                              <span className="text-[12px] text-gray-400">· {dayItems.length} 条</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {(isToday || dayItems.length === 0) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(dateStr);
                                  setShowAddDialog(true);
                                }}
                                className="flex items-center gap-1 text-purple-500 hover:text-purple-600"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[12px] font-medium">添加</span>
                              </button>
                            )}
                            {isPast && dayItems.length > 0 && !isToday && (
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </div>

                        {/* 事项内容 */}
                        {dayItems.length === 0 ? (
                          <p className="text-[13px] text-gray-300 pl-1">暂无事项</p>
                        ) : shouldCollapse ? (
                          <div
                            className="cursor-pointer"
                            onClick={() => toggleDayExpand(dateStr)}
                          >
                            <p className="text-[13px] text-gray-400 pl-1 truncate">
                              {parseItemCategory(dayItems[0].content).displayContent}
                            </p>
                            <button className="flex items-center gap-1 text-purple-500 mt-1 pl-1">
                              <Eye className="w-3 h-3" />
                              <span className="text-[12px] font-medium">展开查看全部 {dayItems.length} 条</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayItems.map(renderItemCard)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* 日期选择器弹窗 */}
      <DatePickerDialog
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleDateSelect}
        currentDate={currentWeekStart}
        recordedDates={[...new Set(items.map(item => item.date))]}
      />

      {/* 添加事项弹窗 */}
      <DesktopAddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        initialDate={selectedDate || format(new Date(), 'yyyy-MM-dd')}
      />

      {/* 编辑事项弹窗 */}
      <DesktopAddItemDialog
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        editItem={editingItem}
      />

      {/* 复盘弹窗 */}
      <ReviewDialog
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        type="week"
      />
    </div>
  );
}
