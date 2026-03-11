import { useState, useEffect } from 'react';
import { X, Loader2, Home, Battery, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { dataService, ReviewItem } from '../../lib/data-service';

interface DesktopAddItemDialogProps {
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
    headerBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    labelColor: 'text-blue-600',
    placeholder: '今天的基础事项...',
    description: '· 与日常基础固定动作相关：睡眠、饮食、清洁、通勤、视频通话',
    prefix: '【基础】',
  },
  {
    key: 'energy',
    label: '蓄能',
    icon: Battery,
    headerBg: 'bg-green-50',
    borderColor: 'border-green-200',
    labelColor: 'text-green-600',
    placeholder: '今天的蓄能事项...',
    description: '· 与文娱提升自我相关：读书、散步、拉伸、看视频解说',
    prefix: '【蓄能】',
  },
  {
    key: 'create',
    label: '创造',
    icon: Sparkles,
    headerBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    labelColor: 'text-purple-600',
    placeholder: '今天的创造事项...',
    description: '· 与搞钱相关：主副业的工作内容',
    prefix: '【创造】',
  },
] as const;

export default function DesktopAddItemDialog({ isOpen, onClose, initialDate, editItem }: DesktopAddItemDialogProps) {
  const [contents, setContents] = useState({
    basic: '',
    energy: '',
    create: '',
  });
  const [selectedDate, setSelectedDate] = useState(() => initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editItem;

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        const content = editItem.content;
        let parsedContents = { basic: '', energy: '', create: '' };

        if (content.includes('【基础】')) {
          parsedContents.basic = content.replace('【基础】', '').trim();
        } else if (content.includes('【蓄能】')) {
          parsedContents.energy = content.replace('【蓄能】', '').trim();
        } else if (content.includes('【创造】')) {
          parsedContents.create = content.replace('【创造】', '').trim();
        } else {
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

      window.dispatchEvent(new Event('storage-update'));

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

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-[512px] rounded-2xl shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 h-[65px] border-b border-gray-100">
          <h2 className="text-[17px] font-semibold text-gray-800">
            {isEditMode ? '编辑事项' : '添加事项'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
            disabled={isSubmitting}
          >
            <X className="w-[18px] h-[18px] text-gray-500" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            {/* 日期选择 */}
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-gray-500">
                日期
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-[42px] px-4 text-[13px] border border-gray-200 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                disabled={isSubmitting}
              />
            </div>

            {/* 分类输入框 */}
            {ITEM_CATEGORIES.map((category) => {
              const Icon = category.icon;

              return (
                <div key={category.key} className="space-y-2">
                  {/* 分类标签行 */}
                  <div className={`${category.headerBg} flex items-center gap-2 h-10 pl-3 rounded-[14px]`}>
                    <Icon className={`w-3.5 h-3.5 ${category.labelColor}`} />
                    <span className={`text-[13px] font-semibold ${category.labelColor}`}>
                      {category.label}
                    </span>
                    <span className="text-[12px] text-gray-400">
                      {category.description}
                    </span>
                  </div>

                  {/* 文本输入区域 */}
                  <textarea
                    value={contents[category.key]}
                    onChange={(e) => handleContentChange(category.key, e.target.value)}
                    placeholder={category.placeholder}
                    rows={3}
                    className={`w-full px-4 py-3 text-[13px] border ${category.borderColor} rounded-[14px] focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none bg-white placeholder:text-gray-400/50 leading-[22px]`}
                    disabled={isSubmitting}
                  />
                </div>
              );
            })}
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting || !hasAnyContent}
              className="w-full h-[46.5px] rounded-[14px] text-[15px] font-medium text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(174.28deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)'
              }}
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
