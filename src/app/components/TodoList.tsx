import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Check, Circle, Plus, X, ChevronDown, Pencil } from 'lucide-react';
import { dataService, TodoItem } from '../../lib/data-service';

interface TodoListProps {
  onStatsUpdate?: (pendingCount: number) => void;
}

// 平台选项
const PLATFORMS = [
  { value: '小红书', label: '小红书', color: '#ff2442' },
  { value: '抖音', label: '抖音', color: '#00f2ea' },
  { value: '微信公众号', label: '微信公众号', color: '#07c160' },
  { value: '微博', label: '微博', color: '#ff8200' },
  { value: '知乎', label: '知乎', color: '#0084ff' },
  { value: 'B站', label: 'B站', color: '#fb7299' },
  { value: '快手', label: '快手', color: '#ff4906' },
  { value: '视频号', label: '视频号', color: '#07c160' },
  { value: '其他', label: '其他', color: '#6b7280' },
];

export default function TodoList({ onStatsUpdate }: TodoListProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    platform: '',
    platformUrl: '',
    content: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  // 加载待办事项
  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTodos = await dataService.getTodosByDate(today);
      setTodos(fetchedTodos);

      // 更新父组件的待办数量
      const pendingCount = fetchedTodos.filter(t => !t.completed).length;
      onStatsUpdate?.(pendingCount);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [today, onStatsUpdate]);

  useEffect(() => {
    loadTodos();

    const handleStorageChange = () => loadTodos();
    window.addEventListener('storage-update', handleStorageChange);
    return () => window.removeEventListener('storage-update', handleStorageChange);
  }, [loadTodos]);

  // 添加待办事项
  const handleAddTodo = async () => {
    if (!formData.title.trim() || !formData.platform) {
      alert('请填写任务名称和选择平台');
      return;
    }

    try {
      await dataService.addTodo(
        formData.title.trim(),
        formData.platform,
        formData.platformUrl.trim(),
        formData.content.trim(),
        formData.date
      );

      // 重置表单
      setFormData({
        title: '',
        platform: '',
        platformUrl: '',
        content: '',
        date: today,
      });
      setShowAddForm(false);
      loadTodos();
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('添加失败，请重试');
    }
  };

  // 编辑待办事项
  const handleEditTodo = (todo: TodoItem) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title,
      platform: todo.platform,
      platformUrl: todo.platformUrl || '',
      content: todo.content,
      date: todo.date,
    });
  };

  // 更新待办事项
  const handleUpdateTodo = async () => {
    if (!editingTodo) return;
    if (!formData.title.trim() || !formData.platform) {
      alert('请填写任务名称和选择平台');
      return;
    }

    try {
      await dataService.updateTodo(
        editingTodo.id,
        formData.title.trim(),
        formData.platform,
        formData.platformUrl.trim(),
        formData.content.trim()
      );

      // 重置表单
      setEditingTodo(null);
      setFormData({
        title: '',
        platform: '',
        platformUrl: '',
        content: '',
        date: today,
      });
      loadTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      alert('更新失败，请重试');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingTodo(null);
    setFormData({
      title: '',
      platform: '',
      platformUrl: '',
      content: '',
      date: today,
    });
  };

  // 切换完成状态
  const handleToggleComplete = async (todo: TodoItem) => {
    try {
      await dataService.toggleTodo(todo.id, !todo.completed);
      loadTodos();
    } catch (error) {
      console.error('Error toggling todo:', error);
      alert('更新失败，请重试');
    }
  };

  // 删除待办事项
  const handleDeleteTodo = async (id: string) => {
    if (!window.confirm('确定要删除这条任务吗？')) return;

    try {
      await dataService.deleteTodo(id);
      loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('删除失败，请重试');
    }
  };

  // 计算进度
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 获取平台颜色
  const getPlatformColor = (platform: string) => {
    const p = PLATFORMS.find(p => p.value === platform);
    return p?.color || '#6b7280';
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="border-b border-gray-100 px-8 pt-7 pb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">待办清单</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhCN })}
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="h-8 px-4 bg-white border border-black/10 rounded-lg flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>添加任务</span>
          </button>
        </div>

        {/* 进度条 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {completedCount} / {totalCount} 完成
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        {/* 添加/编辑任务表单 */}
        {(showAddForm || editingTodo) && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* 任务名称 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">任务名称</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="例：美食日记"
                  className="w-full h-8 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                />
              </div>
              {/* 平台选择 */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">平台</label>
                <button
                  onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                  className="w-full h-8 px-3 bg-white border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between"
                >
                  <span className={formData.platform ? 'text-gray-700' : 'text-gray-400'}>
                    {formData.platform || '选择平台'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showPlatformDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, platform: p.value }));
                          setShowPlatformDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-gray-700">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 任务内容 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">任务内容</label>
              <input
                type="text"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="例：发布今日美食视频"
                className="w-full h-8 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* 平台链接 */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">平台链接（可选）</label>
              <input
                type="url"
                value={formData.platformUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, platformUrl: e.target.value }))}
                placeholder="例：https://creator.xiaohongshu.com"
                className="w-full h-8 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={editingTodo ? handleUpdateTodo : handleAddTodo}
                className="h-8 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                {editingTodo ? '保存' : '添加'}
              </button>
              <button
                onClick={editingTodo ? handleCancelEdit : () => {
                  setShowAddForm(false);
                  setFormData({
                    title: '',
                    platform: '',
                    platformUrl: '',
                    content: '',
                    date: today,
                  });
                }}
                className="h-8 px-4 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              {!editingTodo && <span className="text-xs text-gray-400 ml-2">Ctrl+Enter 快速添加</span>}
            </div>
          </div>
        )}

        {/* 今日待完成列表 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-gray-500">今日待完成</h2>
            {totalCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-500 rounded">
                {totalCount - completedCount} 项
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">暂无待办事项</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-sm text-purple-500 hover:text-purple-600"
              >
                添加第一个任务
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  {/* 勾选框 */}
                  <button
                    onClick={() => handleToggleComplete(todo)}
                    className="shrink-0"
                  >
                    {todo.completed ? (
                      <div className="w-4 h-4 bg-gray-900 rounded flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                    )}
                  </button>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {todo.title}
                      </span>
                      {todo.platformUrl ? (
                        <a
                          href={todo.platformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${getPlatformColor(todo.platform)}20`,
                            color: getPlatformColor(todo.platform)
                          }}
                        >
                          {todo.platform}
                        </a>
                      ) : (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${getPlatformColor(todo.platform)}20`,
                            color: getPlatformColor(todo.platform)
                          }}
                        >
                          {todo.platform}
                        </span>
                      )}
                    </div>
                    {todo.content && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {todo.content}
                      </p>
                    )}
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {/* 编辑按钮 */}
                  <button
                    onClick={() => handleEditTodo(todo)}
                    className="shrink-0 p-1 text-gray-300 hover:text-purple-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
