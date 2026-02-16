import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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
    // Decode JWT to get user ID
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  const userId = getUserIdFromToken(authHeader);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // GET - Fetch items
    if (req.method === 'GET') {
      const { startDate, endDate } = req.query;

      let query = supabase
        .from('review_items')
        .select('id, content, record_date, created_at, updated_at')
        .eq('user_id', userId)
        .order('record_date', { ascending: false });

      if (startDate && typeof startDate === 'string') {
        query = query.gte('record_date', startDate);
      }

      if (endDate && typeof endDate === 'string') {
        query = query.lte('record_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Fetch items error:', error);
        return res.status(500).json({ error: 'Failed to fetch items' });
      }

      // Transform to match frontend format
      const items = (data || []).map(item => ({
        id: item.id,
        content: item.content,
        date: item.record_date,
        createdAt: new Date(item.created_at).getTime(),
        user_id: userId,
      }));

      return res.status(200).json({ items });
    }

    // POST - Create item
    if (req.method === 'POST') {
      const { content, date } = req.body;

      if (!content || !date) {
        return res.status(400).json({ error: 'Content and date are required' });
      }

      const { data, error } = await supabase
        .from('review_items')
        .insert({
          user_id: userId,
          content,
          record_date: date,
        })
        .select('id, content, record_date, created_at')
        .single();

      if (error) {
        console.error('Create item error:', error);
        return res.status(500).json({ error: 'Failed to create item' });
      }

      return res.status(201).json({
        item: {
          id: data.id,
          content: data.content,
          date: data.record_date,
          createdAt: new Date(data.created_at).getTime(),
          user_id: userId,
        },
      });
    }

    // DELETE - Delete item
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Item ID is required' });
      }

      // Verify ownership before deleting
      const { data: existingItem, error: fetchError } = await supabase
        .from('review_items')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingItem) {
        return res.status(404).json({ error: 'Item not found' });
      }

      if (existingItem.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error } = await supabase
        .from('review_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete item error:', error);
        return res.status(500).json({ error: 'Failed to delete item' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Items API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
