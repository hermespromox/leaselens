'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function origin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com').replace(/\/$/, '');
}

function redirectWithMessage(path: string, type: 'error' | 'message', message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (!email || !password) redirectWithMessage('/signup', 'error', 'Email and password are required.');
  if (password.length < 8) redirectWithMessage('/signup', 'error', 'Password must be at least 8 characters.');
  if (password !== confirmPassword) redirectWithMessage('/signup', 'error', 'Passwords do not match.');

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin()}/auth/callback?next=/account` },
  });

  // GoTrue returns 500 "Database error saving new user" for duplicate emails (known bug)
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('database error') || msg.includes('duplicate') || msg.includes('already')) {
      // Check if the user is confirmed or not
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInData?.user && !signInError) {
        if (!signInData.user.email_confirmed_at) {
          await supabase.auth.signOut();
          redirectWithMessage('/login', 'error', 'This email is already registered but not confirmed. Check your inbox for the confirmation link, or reset your password.');
        }
        revalidatePath('/', 'layout');
        redirect('/account');
      }
      redirectWithMessage('/login', 'error', 'This email is already registered. Please log in or reset your password.');
    }
    redirectWithMessage('/signup', 'error', error.message);
  }

  // Supabase may return success but with no session for existing unconfirmed users
  if (!data?.session && !data?.user) {
    redirectWithMessage('/login', 'error', 'This email is already registered. Please log in or reset your password.');
  }

  redirectWithMessage('/login', 'message', 'Account created. Check your inbox for a confirmation link before logging in.');
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) redirectWithMessage('/login', 'error', 'Email and password are required.');

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirectWithMessage('/login', 'error', 'Invalid email or password.');
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    // Resend confirmation email automatically
    await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${origin()}/auth/callback?next=/account` } });
    redirectWithMessage('/login', 'error', 'Your email is not confirmed yet. We just sent a new confirmation link — check your inbox.');
  }

  revalidatePath('/', 'layout');
  redirect('/account');
}

export async function logoutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) redirectWithMessage('/reset-password', 'error', 'Email is required.');

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin()}/auth/callback?next=/update-password`,
  });

  if (error) redirectWithMessage('/reset-password', 'error', error.message);
  redirectWithMessage('/reset-password', 'message', 'Password reset link sent.');
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (password.length < 8) redirectWithMessage('/update-password', 'error', 'Password must be at least 8 characters.');
  if (password !== confirmPassword) redirectWithMessage('/update-password', 'error', 'Passwords do not match.');

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirectWithMessage('/update-password', 'error', error.message);

  redirectWithMessage('/account', 'message', 'Password updated.');
}
