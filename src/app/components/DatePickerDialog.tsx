import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DatePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  currentDate: Date;
}

export default function DatePickerDialog({ isOpen, onClose, onSelectDate, currentDate }: DatePickerDialogProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date());

  if (!isOpen) return null;

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  
  // 获取月份的所有日期，包括前后填充的日期
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - monthStart.getDay() + 1); // 从周一开始
  
  const endDate = new Date(monthEnd);
  const daysToAdd = 7 - endDate.getDay();
  endDate.setDate(endDate.getDate() + daysToAdd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => {
    setViewMonth(subMonths(viewMonth, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(addMonths(viewMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    onSelectDate(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-lg font-medium text-purple-900">选择日期</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-purple-600" />
          </button>
        </div>

        {/* 日历内容 */}
        <div className="p-4">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-purple-50 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-purple-600" />
            </button>
            <span className="text-base font-medium text-purple-900">
              {format(viewMonth, 'yyyy年M月', { locale: zhCN })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-purple-50 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <div key={day} className="text-center text-xs text-purple-600 py-2 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, viewMonth);
              const isSelected = isSameDay(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                    ${isSelected ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium shadow-md' : ''}
                    ${isToday && !isSelected ? 'border-2 border-purple-400 font-medium text-purple-600' : ''}
                    ${!isSelected && isCurrentMonth ? 'hover:bg-purple-50 active:bg-purple-100' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* 快捷选择 */}
          <div className="mt-4 pt-4 border-t border-purple-100 flex gap-2">
            <button
              onClick={() => handleDateClick(new Date())}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-pink-200 active:from-purple-300 active:to-pink-300 text-sm font-medium transition-all"
            >
              今天
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}