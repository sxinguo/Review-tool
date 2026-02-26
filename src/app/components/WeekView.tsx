import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Calendar, Home, Battery, Sparkles, ChevronRight, Eye, Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO, isBefore, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import DatePickerDialog from './DatePickerDialog';
import AddItemDialog from './AddItemDialog';
import { dataService, ReviewItem } from '../../lib/data-service';

interface WeekViewProps {
  onDateClick?: (date: string) => void;
}

// 分类配置
const CATEGORY_CONFIG = {
  basic: {
    prefix: '【基础】',
    label: '基础',
    icon: Home,
    colorClass: 'bg-blue-50/70 border-l-2 border-blue-400',
    iconColor: 'text-blue-500',
    order: 1,
  },
  energy: {
    prefix: '【蓄能】',
    label: '蓄能',
    icon: Battery,
    colorClass: 'bg-green-50/70 border-l-2 border-green-400',
    iconColor: 'text-green-500',
    order: 2,
  },
  create: {
    prefix: '【创造】',
    label: '创造',
    icon: Sparkles,
    colorClass: 'bg-purple-50/70 border-l-2 border-purple-400',
    iconColor: 'text-purple-500',
    order: 3,
  },
  other: {
    prefix: '',
    label: '',
    icon: null,
    colorClass: 'bg-gray-50/70 border-l-2 border-gray-300',
    iconColor: 'text-gray-500',
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

export default function WeekView({ onDateClick }: WeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set()); // 记录展开的天
  const [showAddDialog, setShowAddDialog] = useState(false); // 添加事项弹窗

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

    // Listen for data updates
    const handleStorageChange = () => {
      loadItems();
    };

    window.addEventListener('storage-update', handleStorageChange);
    return () => window.removeEventListener('storage-update', handleStorageChange);
  }, [loadItems]);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

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

  // 获取某天的事项，并按分类排序，同一分类内按创建时间排序
  const getItemsForDate = (date: Date) => {
    const dayItems = items.filter(item => {
      const itemDate = parseISO(item.date);
      return isSameDay(itemDate, date);
    });

    // 先按分类排序，同一分类内按创建时间排序
    return dayItems.sort((a, b) => {
      const categoryA = parseItemCategory(a.content).category;
      const categoryB = parseItemCategory(b.content).category;

      // 先比较分类
      const categoryOrder = CATEGORY_CONFIG[categoryA].order - CATEGORY_CONFIG[categoryB].order;
      if (categoryOrder !== 0) {
        return categoryOrder;
      }

      // 同一分类内，按创建时间排序（早的在前）
      return a.createdAt - b.createdAt;
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    // 二次确认
    if (!window.confirm('确定要删除这条记录吗？')) {
      return;
    }

    try {
      await dataService.deleteItem(itemId);
      // Update local state
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('删除失败，请重试');
    }
  };

  // 渲染单条事项（简化版，用于折叠状态）
  const renderCollapsedItem = (item: ReviewItem) => {
    const { displayContent } = parseItemCategory(item.content);

    return (
      <p className="text-xs text-gray-400 truncate leading-relaxed">
        {displayContent}
      </p>
    );
  };

  // 渲染单条事项（完整版）
  const renderItem = (item: ReviewItem) => {
    const { category, displayContent } = parseItemCategory(item.content);
    const config = CATEGORY_CONFIG[category];
    const Icon = config.icon;

    return (
      <div
        key={item.id}
        className={`${config.colorClass} rounded-md px-2 py-1.5 pr-14 flex items-start gap-1.5 active:opacity-80 transition-all cursor-pointer group relative`}
        onClick={() => setEditingItem(item)}
      >
        {Icon && (
          <Icon className={`w-3.5 h-3.5 ${config.iconColor} shrink-0 mt-0.5`} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            {config.label && (
              <span className={`text-[10px] font-medium ${config.iconColor} shrink-0`}>
                {config.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
            {displayContent}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteItem(item.id);
          }}
          className="absolute right-1.5 top-1.5 text-[10px] text-red-400 hover:text-red-500 px-1.5 py-0.5 hover:bg-red-50 rounded transition-colors"
        >
          删除
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 周导航 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-3 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 hover:bg-purple-50 rounded-full active:bg-purple-100 transition-colors"
          >
            <ChevronUp className="w-4 h-4 text-purple-600" />
          </button>

          <button
            onClick={() => setShowDatePicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-150 hover:to-pink-150 rounded-full active:from-purple-200 active:to-pink-200 transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-xs text-purple-900 font-medium">
              {format(currentWeekStart, 'M月d日', { locale: zhCN })} - {format(weekEnd, 'M月d日', { locale: zhCN })}
            </span>
          </button>

          <button
            onClick={handleNextWeek}
            className="p-1.5 hover:bg-purple-50 rounded-full active:bg-purple-100 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-purple-600" />
          </button>
        </div>
      </div>

      {/* 周视图内容 */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          weekDays.map((day) => {
            const dayItems = getItemsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
            const dateStr = format(day, 'yyyy-MM-dd');
            const isExpanded = expandedDays.has(dateStr);

            // 判断是否需要折叠（往期且有记录）
            const shouldCollapse = isPast && dayItems.length > 0 && !isExpanded;

            return (
              <div key={dateStr} className="bg-white/70 backdrop-blur-sm mb-1.5 rounded-lg shadow-sm overflow-hidden">
                <div
                  className={`px-2.5 py-1.5 cursor-pointer hover:bg-purple-50/50 transition-colors ${isToday ? 'bg-gradient-to-r from-purple-100 to-pink-100' : 'bg-gray-50/30'}`}
                  onClick={() => {
                    if (isPast && dayItems.length > 0) {
                      toggleDayExpand(dateStr);
                    } else {
                      onDateClick?.(dateStr);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">
                        {format(day, 'EEE', { locale: zhCN })}
                      </span>
                      <span className={`text-sm ${isToday ? 'text-purple-700 font-medium' : 'text-gray-800'}`}>
                        {format(day, 'M月d日', { locale: zhCN })}
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full">
                          今天
                        </span>
                      )}
                      {isPast && dayItems.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          ·{dayItems.length}条
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isToday && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddDialog(true);
                          }}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span className="text-[10px]">添加</span>
                        </button>
                      )}
                      {isPast && dayItems.length > 0 && (
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-2.5 py-2">
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-gray-300 py-0.5">暂无事项</p>
                  ) : shouldCollapse ? (
                    // 折叠状态：只显示第一条，灰色
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleDayExpand(dateStr)}
                    >
                      {renderCollapsedItem(dayItems[0])}
                      <div className="flex items-center gap-1 mt-1 text-gray-400">
                        <Eye className="w-3 h-3" />
                        <span className="text-[10px]">展开查看全部 {dayItems.length} 条</span>
                      </div>
                    </div>
                  ) : (
                    // 展开状态：显示所有记录
                    <div className="space-y-1.5">
                      {dayItems.map((item) => renderItem(item))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 日期选择器弹窗 */}
      <DatePickerDialog
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleDateSelect}
        currentDate={currentWeekStart}
      />

      {/* 新建事项弹窗 */}
      <AddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        initialDate={format(new Date(), 'yyyy-MM-dd')}
      />

      {/* 编辑事项弹窗 */}
      <AddItemDialog
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        editItem={editingItem}
      />
    </div>
  );
}
