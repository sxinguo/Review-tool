import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useIsMobile } from './ui/use-mobile';

interface DatePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  currentDate: Date;
}

export default function DatePickerDialog({ isOpen, onClose, onSelectDate, currentDate }: DatePickerDialogProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const isMobile = useIsMobile();

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

  // 渲染日期按钮
  const renderDateButton = (day: Date) => {
    const isCurrentMonth = isSameMonth(day, viewMonth);
    const isSelected = isSameDay(day, currentDate);
    const isToday = isSameDay(day, new Date());

    return (
      <button
        key={day.toISOString()}
        onClick={() => handleDateClick(day)}
        className={`
          w-full aspect-square flex items-center justify-center rounded-lg text-sm transition-all
          ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
          ${isSelected ? 'text-white font-medium shadow-md' : ''}
          ${isToday && !isSelected ? 'border-2 border-purple-400 font-medium text-purple-600' : ''}
          ${!isSelected && isCurrentMonth ? 'hover:bg-purple-50 active:bg-purple-100' : ''}
        `}
        style={isSelected ? {
          background: 'linear-gradient(135deg, #a855f7, #ec4899)'
        } : {}}
      >
        {format(day, 'd')}
      </button>
    );
  };

  // 移动端布局 - 底部弹出
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div className="bg-white w-full rounded-t-2xl shadow-2xl">
          {/* 头部 */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
            style={{ background: 'linear-gradient(to right, #a855f7, #ec4899)' }}
          >
            <span className="text-lg font-medium text-white">选择日期</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 月份导航 */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handlePrevMonth}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5 text-purple-600" />
            </button>
            <span className="text-base font-medium text-gray-800">
              {format(viewMonth, 'yyyy年M月', { locale: zhCN })}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 px-4">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <div
                key={day}
                className="h-10 flex items-center justify-center text-xs text-purple-600 font-medium"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {days.map(renderDateButton)}
          </div>

          {/* 快捷选择 */}
          <div className="px-4 pb-6 pt-2 border-t border-gray-100">
            <button
              onClick={() => handleDateClick(new Date())}
              className="w-full h-11 rounded-lg text-white font-medium"
              style={{ background: 'linear-gradient(to right, #a855f7, #ec4899)' }}
            >
              今天
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 桌面端布局 - 居中弹窗
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-[320px] rounded-2xl shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-[17px] font-semibold text-gray-800">选择日期</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            <X className="w-[18px] h-[18px] text-gray-500" />
          </button>
        </div>

        {/* 日历内容 */}
        <div className="p-5">
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-[15px] font-medium text-gray-800">
              {format(viewMonth, 'yyyy年M月', { locale: zhCN })}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <div key={day} className="text-center text-[12px] text-gray-400 py-2 font-medium">
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
                    aspect-square flex items-center justify-center rounded-[10px] text-[13px] transition-all
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                    ${isSelected ? 'text-white font-medium' : ''}
                    ${isToday && !isSelected ? 'font-medium' : ''}
                    ${!isSelected && isCurrentMonth ? 'hover:bg-gray-100' : ''}
                  `}
                  style={isSelected ? {
                    background: 'linear-gradient(171.73deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
                  } : isToday && !isSelected ? {
                    color: 'rgb(139, 92, 246)'
                  } : {}}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* 快捷选择 */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleDateClick(new Date())}
              className="w-full py-2.5 rounded-xl text-[14px] font-medium text-white transition-all"
              style={{
                background: 'linear-gradient(171.73deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
              }}
            >
              回到今天
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
