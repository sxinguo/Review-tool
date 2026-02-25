import { useState, useEffect } from 'react';
import { X, Loader2, Home, Battery, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { dataService, ReviewItem } from '../../lib/data-service';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  editItem?: ReviewItem | null;
}

// 事项类型配置
const ITEM_CATEGORIES = [
  {
    key: 'basic',
    label: '基础',
    icon: Home,
    color: 'blue',
    placeholder: '与日常基础固定动作相关：睡眠、饮食、清洁、通勤、视频通话',
    prefix: '【基础】',
  },
  {
    key: 'energy',
    label: '蓄能',
    icon: Battery,
    color: 'green',
    placeholder: '与文娱提升自我相关：读书、散步、拉伸、看视频解说',
    prefix: '【蓄能】',
  },
  {
    key: 'create',
    label: '创造',
    icon: Sparkles,
    color: 'purple',
    placeholder: '与搞钱相关：主副业的工作内容',
    prefix: '【创造】',
  },
] as const;

export default function AddItemDialog({ isOpen, onClose, initialDate, editItem }: AddItemDialogProps) {
  const [contents, setContents] = useState({
    basic: '',
    energy: '',
    create: '',
  });
  const [selectedDate, setSelectedDate] = useState(() => initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editItem;

  // Update selected date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Handle edit mode or reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        // 编辑模式：尝试解析已有内容的分类
        const content = editItem.content;
        let parsedContents = { basic: '', energy: '', create: '' };

        if (content.includes('【基础】')) {
          parsedContents.basic = content.replace('【基础】', '').trim();
        } else if (content.includes('【蓄能】')) {
          parsedContents.energy = content.replace('【蓄能】', '').trim();
        } else if (content.includes('【创造】')) {
          parsedContents.create = content.replace('【创造】', '').trim();
        } else {
          // 旧数据没有前缀，放入第一个输入框
          parsedContents.basic = content;
        }

        setContents(parsedContents);
        setSelectedDate(editItem.date);
      } else {
        setContents({ basic: '', energy: '', create: '' });
        setSelectedDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
      }
    }
  }, [isOpen, editItem, initialDate]);

  if (!isOpen) return null;

  const handleContentChange = (key: keyof typeof contents, value: string) => {
    setContents(prev => ({ ...prev, [key]: value }));
  };

  const hasAnyContent = contents.basic.trim() || contents.energy.trim() || contents.create.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasAnyContent) {
      alert('请至少填写一项内容');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && editItem) {
        // 编辑模式：只更新这一条记录
        // 找出有内容的那个字段
        let newContent = '';
        if (contents.basic.trim()) {
          newContent = `【基础】${contents.basic.trim()}`;
        } else if (contents.energy.trim()) {
          newContent = `【蓄能】${contents.energy.trim()}`;
        } else if (contents.create.trim()) {
          newContent = `【创造】${contents.create.trim()}`;
        }

        if (newContent) {
          await dataService.updateItem(editItem.id, newContent, selectedDate);
        }
      } else {
        // 新增模式：为每个有内容的分类创建一条记录
        const promises: Promise<void>[] = [];

        if (contents.basic.trim()) {
          promises.push(dataService.addItem(`【基础】${contents.basic.trim()}`, selectedDate));
        }
        if (contents.energy.trim()) {
          promises.push(dataService.addItem(`【蓄能】${contents.energy.trim()}`, selectedDate));
        }
        if (contents.create.trim()) {
          promises.push(dataService.addItem(`【创造】${contents.create.trim()}`, selectedDate));
        }

        await Promise.all(promises);
      }

      // Trigger update event
      window.dispatchEvent(new Event('storage-update'));

      // Reset form
      setContents({ basic: '', energy: '', create: '' });
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500' },
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-base font-medium text-purple-900">
            {isEditMode ? '编辑事项' : '添加事项'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-purple-100 rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-purple-600" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {/* 日期选择 */}
            <div>
              <label className="block text-xs font-medium text-purple-900 mb-1.5">
                日期
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-purple-50/30"
                disabled={isSubmitting}
              />
            </div>

            {/* 分类输入框 */}
            <div className="space-y-2">
              {ITEM_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const colorClasses = getColorClasses(category.color);

                return (
                  <div key={category.key} className={`${colorClasses.bg} rounded-lg p-2.5 border ${colorClasses.border}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${colorClasses.icon}`} />
                      <label className={`text-xs font-medium ${colorClasses.text} leading-none`}>
                        {category.label}
                      </label>
                    </div>
                    <textarea
                      value={contents[category.key]}
                      onChange={(e) => handleContentChange(category.key, e.target.value)}
                      placeholder={category.placeholder}
                      rows={2}
                      className="w-full px-2 py-1.5 text-xs border border-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none bg-white/70 placeholder:text-gray-400 leading-relaxed"
                      disabled={isSubmitting}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="p-3 border-t border-purple-100 bg-white">
            <button
              type="submit"
              disabled={isSubmitting || !hasAnyContent}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
