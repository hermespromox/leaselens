'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function origin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://leaselens-pi.vercel.app').replace(/\/$/, '');
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin()}/auth/callback?next=/account` },
  });

  if (error) redirectWithMessage('/signup', 'error', error.message);
  redirectWithMessage('/login', 'message', 'Account created. Check your email if confirmation is enabled, then sign in.');
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) redirectWithMessage('/login', 'error', 'Email and password are required.');

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirectWithMessage('/login', 'error', error.message);

  revalidatePath('/', 'layout');
  redirect('/history');
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
