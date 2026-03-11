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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, inviteCode } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入账号名和密码' });
  }

  // Validate username format (alphanumeric, 3-20 chars)
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: '账号名格式不正确（3-20位字母、数字或下划线）' });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }

  try {
    const email = `${username.toLowerCase()}@review.app`;

    // First, try to sign in with the provided password (existing user)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInError && signInData.session) {
      // User exists and password matches - login successful
      return res.status(200).json({
        success: true,
        session: signInData.session,
        isNewUser: false,
      });
    }

    // Login failed - check if user exists
    // If signInError is "Invalid login credentials", user might exist with wrong password
    // or user doesn't exist at all
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: '服务器错误' });
    }

    const existingUser = usersData.users.find(u => u.email === email);

    if (existingUser) {
      // User exists but password is wrong
      return res.status(400).json({ error: '密码错误' });
    }

    // User doesn't exist - need to register with invite code
    if (!inviteCode) {
      return res.status(400).json({ error: '该账号不存在，请输入邀请码进行注册' });
    }

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

    // Create new user with the provided password
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
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
