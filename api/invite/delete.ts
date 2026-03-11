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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin key
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invite code ID is required' });
  }

  try {
    // Check if code is used
    const { data: codeData, error: fetchError } = await supabase
      .from('invite_codes')
      .select('is_used')
      .eq('id', id)
      .single();

    if (fetchError || !codeData) {
      return res.status(404).json({ error: 'Invite code not found' });
    }

    if (codeData.is_used) {
      return res.status(400).json({ error: 'Cannot delete a used invite code' });
    }

    // Delete the code
    const { error: deleteError } = await supabase
      .from('invite_codes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({
      success: true,
      message: 'Invite code deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete invite code error:', error);
    return res.status(500).json({ error: 'Failed to delete invite code' });
  }
}
