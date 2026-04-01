import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, Pin, Trash2, FileText } from 'lucide-react';
import { dataService, NoteItem } from '../../lib/data-service';
import { toast } from 'sonner';

// 笔记卡片组件
function NoteCard({
  note,
  onUpdate,
  onDelete,
  onTogglePin,
}: {
  note: NoteItem;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePin: (id: string, isPinned: boolean) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showActions, setShowActions] = useState(false);

  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error('内容不能为空');
      return;
    }
    await onUpdate(note.id, editContent.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(note.content);
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-20 resize-none outline-none text-sm text-gray-700 border border-gray-200 rounded-lg p-2 focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 置顶标记 */}
      {note.isPinned && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />
      )}

      <div className="min-w-0">
        {/* 内容 */}
        <p
          className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words cursor-pointer hover:text-purple-600 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          {note.content}
        </p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(note.createdAt, { addSuffix: true, locale: zhCN })}
          </span>

          {/* 操作按钮 */}
          <div
            className={`flex items-center gap-1 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* 置顶 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(note.id, !note.isPinned);
              }}
              className={`p-1 transition-colors ${
                note.isPinned ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
            </button>
            {/* 删除 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Notebook() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputContent, setInputContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedNotes = await dataService.getNotes();
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
    const handleStorageChange = () => loadNotes();
    window.addEventListener('storage-update', handleStorageChange);
    return () => window.removeEventListener('storage-update', handleStorageChange);
  }, [loadNotes]);

  const handleAddNote = async () => {
    if (!inputContent.trim()) {
      toast.error('请输入内容');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('添加中...');
    try {
      await dataService.addNote(inputContent.trim(), '#ffffff');
      setInputContent('');
      loadNotes();
      toast.dismiss(toastId);
      toast.success('添加成功');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.dismiss(toastId);
      toast.error('添加失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (id: string, content: string) => {
    const toastId = toast.loading('更新中...');
    try {
      await dataService.updateNote(id, content, '#ffffff');
      loadNotes();
      toast.dismiss(toastId);
      toast.success('更新成功');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.dismiss(toastId);
      toast.error('更新失败，请重试');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('确定要删除这条笔记吗？')) return;
    const toastId = toast.loading('删除中...');
    try {
      await dataService.deleteNote(id);
      loadNotes();
      toast.dismiss(toastId);
      toast.success('删除成功');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.dismiss(toastId);
      toast.error('删除失败，请重试');
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const toastId = toast.loading(isPinned ? '置顶中...' : '取消置顶中...');
    try {
      await dataService.togglePinNote(id, isPinned);
      loadNotes();
      toast.dismiss(toastId);
      toast.success(isPinned ? '已置顶' : '已取消置顶');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.dismiss(toastId);
      toast.error('操作失败，请重试');
    }
  };

  const totalCount = notes.length;
  const pinnedCount = notes.filter((n) => n.isPinned).length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="border-b border-gray-100 px-8 pt-7 pb-5">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900">记事本</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalCount} 条记录，{pinnedCount} 条已置顶
          </p>
        </div>

        {/* 输入区域 */}
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <div className="h-[120px] px-5 pt-4">
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="随手记点什么……"
              className="w-full h-full resize-none outline-none text-sm text-gray-700 placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAddNote();
                }
              }}
            />
          </div>
          <div className="h-px bg-gray-100 mx-5" />
          <div className="h-12 px-5 flex items-center justify-end">
            {/* 添加按钮 */}
            <button
              onClick={handleAddNote}
              disabled={isSubmitting || !inputContent.trim()}
              className="h-8 px-4 rounded-lg flex items-center gap-1.5 text-white text-sm font-medium disabled:opacity-40 transition-all"
              style={{
                background: 'linear-gradient(155.14deg, rgb(244, 114, 182) 0%, rgb(139, 92, 246) 100%)',
              }}
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>记下来</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">暂无笔记</p>
            <p className="text-xs text-gray-300 mt-1">开始记录你的第一条笔记吧</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-0">
            {[...notes]
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.createdAt - a.createdAt;
              })
              .map((note) => (
              <div key={note.id} className="break-inside-avoid mb-4">
                <NoteCard
                  note={note}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
