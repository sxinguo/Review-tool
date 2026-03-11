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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const userId = getUserIdFromToken(authHeader);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  if (items.length === 0) {
    return res.status(200).json({ success: true, migratedCount: 0 });
  }

  try {
    // Prepare items for insertion
    const itemsToInsert = items.map((item: any) => ({
      user_id: userId,
      content: item.content,
      record_date: item.date,
      // Preserve original creation time if available
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    }));

    // Insert items in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
      const batch = itemsToInsert.slice(i, i + batchSize);

      const { error } = await supabase
        .from('review_items')
        .insert(batch);

      if (error) {
        console.error('Migration batch error:', error);
        // Continue with other batches
      } else {
        insertedCount += batch.length;
      }
    }

    return res.status(200).json({
      success: true,
      migratedCount: insertedCount,
      totalItems: items.length,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return res.status(500).json({ error: 'Failed to migrate data' });
  }
}
