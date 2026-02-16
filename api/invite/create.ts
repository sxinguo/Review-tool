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

function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters like I, O, 0, 1
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin key
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { count = 1, length = 8 } = req.body;

  if (count < 1 || count > 100) {
    return res.status(400).json({ error: 'Count must be between 1 and 100' });
  }

  try {
    const codes: Array<{ id: string; code: string; created_at: string }> = [];

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let success = false;

      while (!success && attempts < 10) {
        const code = generateRandomCode(length);

        const { data, error } = await supabase
          .from('invite_codes')
          .insert({ code })
          .select('id, code, created_at')
          .single();

        if (!error && data) {
          codes.push(data);
          success = true;
        } else {
          attempts++;
        }
      }

      if (!success) {
        console.error(`Failed to generate code after ${attempts} attempts`);
      }
    }

    return res.status(200).json({
      success: true,
      count: codes.length,
      codes,
    });
  } catch (error: any) {
    console.error('Create invite codes error:', error);
    return res.status(500).json({ error: 'Failed to create invite codes' });
  }
}
