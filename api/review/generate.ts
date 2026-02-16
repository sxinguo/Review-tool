import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const kimiApiKey = process.env.KIMI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function getUserIdFromToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `你是一位专业的复盘助手，帮助用户分析他们在工作、学习或生活中的记录事项。

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

async function callKimiAPI(items: any[], type: string, startDate: string, endDate: string): Promise<string> {
  if (!kimiApiKey) {
    // Return mock content if no API key
    return generateMockReport(type, startDate, endDate);
  }

  const itemsText = items.map((item, index) => {
    const date = new Date(item.date).toLocaleDateString('zh-CN');
    return `${index + 1}. [${date}] ${item.content}`;
  }).join('\n');

  const userPrompt = `请为以下${type === 'week' ? '周' : '月'}度记录生成复盘报告：

时间范围：${startDate} 至 ${endDate}

记录事项：
${itemsText || '暂无记录'}

请根据以上内容生成详细的复盘分析。`;

  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kimiApiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('Kimi API error:', response.status);
      return generateMockReport(type, startDate, endDate);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateMockReport(type, startDate, endDate);
  } catch (error) {
    console.error('Kimi API call error:', error);
    return generateMockReport(type, startDate, endDate);
  }
}

function generateMockReport(type: string, startDate: string, endDate: string): string {
  return `## 整体总结

在这个${type === 'week' ? '周' : '月'}（${startDate} 至 ${endDate}），你持续记录了自己的事项。保持记录的习惯是成长的第一步！

## 主要亮点

- 坚持记录的习惯值得肯定
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

> 复盘是成长的重要环节，继续加油！`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, startDate, endDate, items: guestItems, isGuest } = req.body;

  if (!type || !startDate || !endDate) {
    return res.status(400).json({ error: 'Type, startDate, and endDate are required' });
  }

  let items = guestItems;

  // If not guest, fetch items from database
  if (!isGuest) {
    const authHeader = req.headers.authorization;
    const userId = getUserIdFromToken(authHeader);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check for cached report first
    const { data: cachedReport } = await supabase
      .from('review_reports')
      .select('content')
      .eq('user_id', userId)
      .eq('report_type', type)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .single();

    if (cachedReport) {
      return res.status(200).json({ content: cachedReport.content, cached: true });
    }

    // Fetch items for the period
    const { data: fetchedItems, error } = await supabase
      .from('review_items')
      .select('id, content, record_date')
      .eq('user_id', userId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: true });

    if (error) {
      console.error('Fetch items error:', error);
      return res.status(500).json({ error: 'Failed to fetch items' });
    }

    items = (fetchedItems || []).map(item => ({
      id: item.id,
      content: item.content,
      date: item.record_date,
    }));
  }

  try {
    // Generate report using Kimi API
    const content = await callKimiAPI(items || [], type, startDate, endDate);

    // Cache report for logged-in users
    if (!isGuest) {
      const authHeader = req.headers.authorization;
      const userId = getUserIdFromToken(authHeader);

      if (userId) {
        await supabase
          .from('review_reports')
          .insert({
            user_id: userId,
            report_type: type,
            start_date: startDate,
            end_date: endDate,
            content,
          });
      }
    }

    return res.status(200).json({ content, cached: false });
  } catch (error: any) {
    console.error('Generate report error:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
}
