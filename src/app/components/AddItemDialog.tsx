import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { dataService } from '../../lib/data-service';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export default function AddItemDialog({ isOpen, onClose, initialDate }: AddItemDialogProps) {
  const [content, setContent] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selected date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Reset content when dialog opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      alert('请输入事项内容');
      return;
    }

    setIsSubmitting(true);

    try {
      await dataService.addItem(content.trim(), selectedDate);

      // Trigger update event
      window.dispatchEvent(new Event('storage-update'));

      // Reset form
      setContent('');
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-lg font-medium text-purple-900">添加事项</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6 text-purple-600" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 p-4 space-y-4">
            {/* 日期选择 */}
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">
                日期
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30"
                disabled={isSubmitting}
              />
            </div>

            {/* 事项内容 */}
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">
                事项内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="记录今天发生了什么..."
                rows={6}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none bg-purple-50/30"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="p-4 border-t border-purple-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
