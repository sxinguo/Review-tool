import { isSupabaseConfigured, supabase } from './supabase';

// Types
export interface ReviewItem {
  id: string;
  content: string;
  date: string; // ISO date string
  createdAt: number;
  user_id?: string;
}

export interface Stats {
  totalDays: number;
  totalItems: number;
  firstRecordDate: number | null;
}

export interface ReviewReport {
  id?: string;
  type: 'week' | 'month';
  startDate: string;
  endDate: string;
  content: string;
}

// LocalStorage keys
const ITEMS_KEY = 'review-items';
const USER_KEY = 'review-user';

// Helper to get local storage items
function getLocalItems(): ReviewItem[] {
  const stored = localStorage.getItem(ITEMS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Helper to save local storage items
function saveLocalItems(items: ReviewItem[]): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('storage-update'));
}

// Helper to get user data
function getLocalUserData(): { firstRecordDate: number | null } {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : { firstRecordDate: null };
}

// Helper to save user data
function saveLocalUserData(data: { firstRecordDate: number | null }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(data));
}

// DataService class
class DataService {
  // Check if in guest mode
  isGuest(): boolean {
    return localStorage.getItem('review-guest-mode') === 'true' || !isSupabaseConfigured();
  }

  // Get Supabase session
  private async getSupabaseSession() {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // Get items
  async getItems(startDate?: string, endDate?: string): Promise<ReviewItem[]> {
    if (this.isGuest()) {
      let items = getLocalItems();
      if (startDate && endDate) {
        items = items.filter(item => item.date >= startDate && item.date <= endDate);
      }
      return items;
    }

    // Logged in - use Supabase directly
    const session = await this.getSupabaseSession();
    if (!session || !supabase) {
      return getLocalItems(); // Fallback to local
    }

    try {
      let query = supabase
        .from('review_items')
        .select('*')
        .order('date', { ascending: false });

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        content: item.content,
        date: item.date,
        createdAt: new Date(item.created_at).getTime(),
        user_id: item.user_id,
      }));
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  }

  // Add item
  async addItem(content: string, date: string): Promise<ReviewItem> {
    if (this.isGuest()) {
      const newItem: ReviewItem = {
        id: Date.now().toString(),
        content: content.trim(),
        date,
        createdAt: Date.now(),
      };

      const items = getLocalItems();
      items.push(newItem);
      saveLocalItems(items);

      // Update first record date
      const userData = getLocalUserData();
      if (!userData.firstRecordDate) {
        userData.firstRecordDate = Date.now();
        saveLocalUserData(userData);
      }

      return newItem;
    }

    // Logged in - use Supabase directly
    const session = await this.getSupabaseSession();
    if (!session || !supabase) {
      throw new Error('Not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('review_items')
        .insert({
          user_id: session.user.id,
          content: content.trim(),
          date,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error('Failed to add item');
      }

      window.dispatchEvent(new Event('storage-update'));
      return {
        id: data.id,
        content: data.content,
        date: data.date,
        createdAt: new Date(data.created_at).getTime(),
        user_id: data.user_id,
      };
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  // Delete item
  async deleteItem(id: string): Promise<void> {
    if (this.isGuest()) {
      const items = getLocalItems();
      const filtered = items.filter(item => item.id !== id);
      saveLocalItems(filtered);
      return;
    }

    // Logged in - use Supabase directly
    const session = await this.getSupabaseSession();
    if (!session || !supabase) {
      throw new Error('Not authenticated');
    }

    try {
      const { error } = await supabase
        .from('review_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error('Failed to delete item');
      }

      window.dispatchEvent(new Event('storage-update'));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Update item
  async updateItem(id: string, content: string, date: string): Promise<ReviewItem> {
    if (this.isGuest()) {
      const items = getLocalItems();
      const index = items.findIndex(item => item.id === id);
      if (index === -1) {
        throw new Error('Item not found');
      }
      items[index] = {
        ...items[index],
        content: content.trim(),
        date,
      };
      saveLocalItems(items);
      return items[index];
    }

    // Logged in - use Supabase directly
    const session = await this.getSupabaseSession();
    if (!session || !supabase) {
      throw new Error('Not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('review_items')
        .update({
          content: content.trim(),
          date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Failed to update item');
      }

      window.dispatchEvent(new Event('storage-update'));
      return {
        id: data.id,
        content: data.content,
        date: data.date,
        createdAt: new Date(data.created_at).getTime(),
        user_id: data.user_id,
      };
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Generate review report
  async generateReport(type: 'week' | 'month', startDate: string, endDate: string): Promise<string> {
    const items = await this.getItems(startDate, endDate);

    // Try to call Kimi API directly (works for local dev)
    const kimiApiKey = import.meta.env.VITE_KIMI_API_KEY;
    if (kimiApiKey) {
      try {
        return await this.callKimiAPI(items, type, startDate, endDate);
      } catch (error) {
        console.error('Kimi API error:', error);
        // Fallback to mock report
        return this.getMockReport(type, startDate, endDate, items.length);
      }
    }

    // Try to call serverless API (for Vercel deployment)
    try {
      const session = await this.getSupabaseSession();
      const response = await fetch('/api/review/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          items,
          isGuest: this.isGuest(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.content;
      }
    } catch (error) {
      console.error('API call error:', error);
    }

    // Fallback to mock report
    return this.getMockReport(type, startDate, endDate, items.length);
  }

  // Call Kimi API directly
  private async callKimiAPI(items: ReviewItem[], type: string, startDate: string, endDate: string): Promise<string> {
    const kimiApiKey = import.meta.env.VITE_KIMI_API_KEY;
    if (!kimiApiKey) {
      throw new Error('Kimi API key not configured');
    }

    const systemPrompt = `你是一位专业的复盘助手，帮助用户分析他们在工作、学习或生活中的记录事项。

你的任务是：
1. 分析用户在指定时间段内的记录事项
2. 总结整体情况和亮点
3. 指出需要改进的地方
4. 给出具体的行动建议

请用友好、鼓励的语气撰写复盘报告，使用中文。

回复格式要求：
- 使用 Markdown 格式
- 包含以下四个部分：整体总结、主要亮点、需要关注、下一步建议
- 每个部分用 ## 标题
- 适当使用列表和粗体增强可读性
- 语言简洁有力，避免冗长`;

    // 按日期分组，结构化数据
    const groupedItems = this.groupItemsByDate(items, type);
    const itemsText = this.formatGroupedItems(groupedItems, type);

    const userPrompt = `请为以下${type === 'week' ? '周' : '月'}度记录生成复盘报告：

时间范围：${startDate} 至 ${endDate}
总事项数：${items.length} 条

${itemsText}

请根据以上内容生成详细的复盘分析。`;

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kimiApiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kimi API error:', response.status, errorText);
      throw new Error(`Kimi API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || this.getMockReport(type, startDate, endDate, items.length);
  }

  // 按日期分组事项
  private groupItemsByDate(items: ReviewItem[], type: 'week' | 'month'): Map<string, ReviewItem[]> {
    const grouped = new Map<string, ReviewItem[]>();

    // 按日期排序
    const sortedItems = [...items].sort((a, b) => a.date.localeCompare(b.date));

    for (const item of sortedItems) {
      const date = item.date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(item);
    }

    return grouped;
  }

  // 格式化分组后的事项
  private formatGroupedItems(grouped: Map<string, ReviewItem[]>, type: 'week' | 'month'): string {
    if (grouped.size === 0) {
      return '暂无记录';
    }

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const lines: string[] = [];

    grouped.forEach((items, date) => {
      const dateObj = new Date(date);
      const weekday = weekdays[dateObj.getDay()];
      const formattedDate = `${date} ${weekday}`;

      lines.push(`### ${formattedDate}`);
      items.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.content}`);
      });
      lines.push(''); // 空行分隔
    });

    return lines.join('\n');
  }

  // Mock report for when API is not available
  private getMockReport(type: string, startDate: string, endDate: string, itemCount: number): string {
    return `## 整体总结

在这个${type === 'week' ? '周' : '月'}（${startDate} 至 ${endDate}），你共记录了 ${itemCount} 条事项。${itemCount > 0 ? '保持记录的习惯是成长的第一步！' : '暂无记录，开始记录你的第一条事项吧！'}

## 主要亮点

- ${itemCount > 0 ? '坚持记录的习惯值得肯定' : '即将开始你的记录之旅'}
- 每一次记录都是对自己的反思
- 持续积累将带来质的飞跃

## 需要关注

- 建议增加记录的详细程度
- 可以尝试分类记录不同领域的事项
- 保持每日记录的连续性

## 下一步建议

1. **保持习惯**：继续坚持每日记录
2. **深入思考**：在记录时多思考原因和改进方向
3. **定期复盘**：养成定期回顾的习惯
4. **设定目标**：为下个周期设定具体的小目标

> 复盘是成长的重要环节，继续加油！

---

*提示：配置 Kimi API 后可获得更智能的 AI 分析*`;
  }

  // Migrate guest data to cloud
  async migrateGuestData(): Promise<{ success: boolean; count: number }> {
    const localItems = getLocalItems();

    if (localItems.length === 0) {
      return { success: true, count: 0 };
    }

    const session = await this.getSupabaseSession();
    if (!session || !supabase) {
      throw new Error('Not authenticated');
    }

    try {
      // Insert all local items to Supabase
      const itemsToInsert = localItems.map(item => ({
        user_id: session.user.id,
        content: item.content,
        date: item.date,
      }));

      const { error } = await supabase
        .from('review_items')
        .insert(itemsToInsert);

      if (error) {
        console.error('Supabase migration error:', error);
        throw new Error('Failed to migrate data');
      }

      // Clear local data after successful migration
      localStorage.removeItem(ITEMS_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('review-guest-mode');
      window.dispatchEvent(new Event('storage-update'));

      return { success: true, count: localItems.length };
    } catch (error) {
      console.error('Error migrating data:', error);
      throw error;
    }
  }

  // Get stats
  async getStats(): Promise<Stats> {
    if (this.isGuest()) {
      const items = getLocalItems();
      const userData = getLocalUserData();

      let totalDays = 0;
      if (userData.firstRecordDate) {
        const diffTime = Math.abs(Date.now() - userData.firstRecordDate);
        totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        totalDays,
        totalItems: items.length,
        firstRecordDate: userData.firstRecordDate,
      };
    }

    // For logged in users, calculate from fetched items
    const items = await this.getItems();

    let firstRecordDate: number | null = null;
    if (items.length > 0) {
      const dates = items.map(item => new Date(item.date).getTime());
      firstRecordDate = Math.min(...dates);
    }

    let totalDays = 0;
    if (firstRecordDate) {
      const diffTime = Math.abs(Date.now() - firstRecordDate);
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      totalDays,
      totalItems: items.length,
      firstRecordDate,
    };
  }
}

// Export singleton instance
export const dataService = new DataService();

// Hook for using DataService in components
export function useDataService() {
  return dataService;
}
