import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Calendar, Pencil } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import DatePickerDialog from './DatePickerDialog';
import AddItemDialog from './AddItemDialog';
import { dataService, ReviewItem } from '../../lib/data-service';

interface WeekViewProps {
  onDateClick?: (date: string) => void;
}

export default function WeekView({ onDateClick }: WeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ReviewItem | null>(null);

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

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      const itemDate = parseISO(item.date);
      return isSameDay(itemDate, date);
    });
  };

  // Color assignment for items
  const getItemColor = (index: number) => {
    const colors = [
      'bg-purple-50 border-l-4 border-purple-300',
      'bg-pink-50 border-l-4 border-pink-300',
      'bg-blue-50 border-l-4 border-blue-300',
      'bg-indigo-50 border-l-4 border-indigo-300',
      'bg-rose-50 border-l-4 border-rose-300',
    ];
    return colors[index % colors.length];
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await dataService.deleteItem(itemId);
      // Update local state
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 周导航 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 hover:bg-purple-50 rounded-full active:bg-purple-100 transition-colors"
          >
            <ChevronUp className="w-5 h-5 text-purple-600" />
          </button>

          <button
            onClick={() => setShowDatePicker(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-150 hover:to-pink-150 rounded-full active:from-purple-200 active:to-pink-200 transition-all"
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-900 font-medium">
              {format(currentWeekStart, 'M月d日', { locale: zhCN })} - {format(weekEnd, 'M月d日', { locale: zhCN })}
            </span>
          </button>

          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-purple-50 rounded-full active:bg-purple-100 transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-purple-600" />
          </button>
        </div>
      </div>

      {/* 周视图内容 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          weekDays.map((day) => {
            const dayItems = getItemsForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="border-b border-purple-100 bg-white/60 backdrop-blur-sm mb-2 rounded-lg mx-2 shadow-sm">
                <div
                  className={`px-4 py-2 rounded-t-lg cursor-pointer hover:bg-purple-100/50 transition-colors ${isToday ? 'bg-gradient-to-r from-purple-100 to-pink-100' : 'bg-gray-50/50'}`}
                  onClick={() => onDateClick?.(format(day, 'yyyy-MM-dd'))}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {format(day, 'EEE', { locale: zhCN })}
                    </span>
                    <span className={`text-base ${isToday ? 'text-purple-700 font-medium' : 'text-gray-900'}`}>
                      {format(day, 'M月d日', { locale: zhCN })}
                    </span>
                    {isToday && (
                      <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                        今天
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3">
                  {dayItems.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">暂无事项</p>
                  ) : (
                    <div className="space-y-2">
                      {dayItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={`${getItemColor(index)} rounded-lg p-3 flex items-start gap-3 active:opacity-80 transition-all shadow-sm cursor-pointer group relative`}
                          onClick={() => setEditingItem(item)}
                        >
                          <div className="flex-1">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                              {item.content}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                            className="text-xs text-red-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded transition-colors shrink-0"
                          >
                            删除
                          </button>
                        </div>
                      ))}
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

      {/* 编辑事项弹窗 */}
      <AddItemDialog
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        editItem={editingItem}
      />
    </div>
  );
}
