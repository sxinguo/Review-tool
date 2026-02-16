import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { dataService } from '../../lib/data-service';

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'week' | 'month';
}

export default function ReviewDialog({ isOpen, onClose, type }: ReviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const generateReport = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    setContent('');

    const now = new Date();
    const start = type === 'week'
      ? startOfWeek(now, { weekStartsOn: 1 })
      : startOfMonth(now);
    const end = type === 'week'
      ? endOfWeek(now, { weekStartsOn: 1 })
      : endOfMonth(now);

    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    try {
      const reportContent = await dataService.generateReport(type, startDate, endDate);
      setContent(reportContent);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || '生成复盘报告失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      generateReport();
    } else {
      // Reset state when dialog closes
      setContent('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, type, generateReport]);

  if (!isOpen) return null;

  const now = new Date();
  const start = type === 'week'
    ? startOfWeek(now, { weekStartsOn: 1 })
    : startOfMonth(now);
  const end = type === 'week'
    ? endOfWeek(now, { weekStartsOn: 1 })
    : endOfMonth(now);

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={index} className="text-base font-semibold text-gray-900 mb-3 mt-6 first:mt-0">
            {line.replace('## ', '')}
          </h3>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h4 key={index} className="text-sm font-semibold text-gray-800 mb-2 mt-4">
            {line.replace('### ', '')}
          </h4>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={index} className="text-sm text-gray-700 ml-4 mb-1">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="text-sm text-purple-600 italic border-l-2 border-purple-300 pl-3 my-3">
            {line.replace('> ', '')}
          </blockquote>
        );
      } else if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        elements.push(
          <p key={index} className="text-sm font-medium text-gray-800 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={index} className="text-sm text-gray-700 mb-2 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <div>
                <h2 className="text-base font-medium text-gray-900">
                  {type === 'week' ? '周复盘' : '月复盘'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {format(start, 'M月d日', { locale: zhCN })} - {format(end, 'M月d日', { locale: zhCN })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-3 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 mt-4">AI 正在生成复盘内容...</p>
              <p className="text-xs text-gray-400 mt-2">这可能需要几秒钟</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-gray-600 text-center mb-4">{error}</p>
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
              >
                重试
              </button>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {renderContent(content)}
            </div>
          )}
        </div>

        {/* 底部 */}
        {!isLoading && !error && (
          <div className="px-5 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
