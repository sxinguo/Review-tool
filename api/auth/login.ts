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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, inviteCode } = req.body;

  if (!username || !inviteCode) {
    return res.status(400).json({ error: '请输入账号名和邀请码' });
  }

  // Validate username format (alphanumeric, 3-20 chars)
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: '账号名格式不正确（3-20位字母、数字或下划线）' });
  }

  try {
    // Check if user already exists
    const email = `${username.toLowerCase()}@review.app`;

    // Try to sign in with invite code as password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: inviteCode,
    });

    if (!signInError && signInData.session) {
      // User exists and password matches - login successful
      return res.status(200).json({
        success: true,
        session: signInData.session,
        isNewUser: false,
      });
    }

    // User doesn't exist or wrong password - check if it's a new user registration
    // Verify invite code
    const { data: inviteCodeData, error: inviteCodeError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.toUpperCase())
      .eq('is_used', false)
      .single();

    if (inviteCodeError || !inviteCodeData) {
      return res.status(400).json({ error: '邀请码无效或已被使用' });
    }

    // Create new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: inviteCode,
      options: {
        data: {
          username,
        },
        emailRedirectTo: undefined, // Disable email confirmation
      },
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return res.status(400).json({ error: signUpError.message || '注册失败' });
    }

    if (!signUpData.user) {
      return res.status(400).json({ error: '注册失败' });
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: signUpData.user.id,
        display_name: username,
        is_guest: false,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Continue anyway - profile is optional
    }

    // Mark invite code as used
    await supabase
      .from('invite_codes')
      .update({
        is_used: true,
        used_by: signUpData.user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', inviteCodeData.id);

    // Return session
    return res.status(200).json({
      success: true,
      session: signUpData.session,
      isNewUser: true,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}
