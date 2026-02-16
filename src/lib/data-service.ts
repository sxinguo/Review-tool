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

    // Logged in - use API
    const session = await this.getSupabaseSession();
    if (!session) {
      return getLocalItems(); // Fallback to local
    }

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/items?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  }

  // Add item
  async addItem(content: string, date: string): Promise<ReviewItem> {
    const newItem: ReviewItem = {
      id: Date.now().toString(),
      content: content.trim(),
      date,
      createdAt: Date.now(),
    };

    if (this.isGuest()) {
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

    // Logged in - use API
    const session = await this.getSupabaseSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: content.trim(), date }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const data = await response.json();
      window.dispatchEvent(new Event('storage-update'));
      return data.item;
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

    // Logged in - use API
    const session = await this.getSupabaseSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`/api/items?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      window.dispatchEvent(new Event('storage-update'));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Generate review report
  async generateReport(type: 'week' | 'month', startDate: string, endDate: string): Promise<string> {
    // For guests or when Supabase is not configured, use mock data
    if (this.isGuest() || !isSupabaseConfigured()) {
      try {
        const items = await this.getItems(startDate, endDate);

        // Try to call API (may fail if serverless functions aren't deployed)
        const response = await fetch('/api/review/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            startDate,
            endDate,
            items,
            isGuest: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.content;
        }

        // If API fails, return mock report
        return this.getMockReport(type, startDate, endDate, items.length);
      } catch (error) {
        console.error('Error generating report:', error);
        const items = await this.getItems(startDate, endDate);
        return this.getMockReport(type, startDate, endDate, items.length);
      }
    }

    // Logged in - use API with auth
    const session = await this.getSupabaseSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/review/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
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
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/items/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ items: localItems }),
      });

      if (!response.ok) {
        throw new Error('Failed to migrate data');
      }

      const data = await response.json();

      // Clear local data after successful migration
      localStorage.removeItem(ITEMS_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('review-guest-mode');
      window.dispatchEvent(new Event('storage-update'));

      return { success: true, count: data.migratedCount || 0 };
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
