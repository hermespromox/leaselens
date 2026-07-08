import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'hermes.promox@gmail.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://asklizy.com';
const RESEND_SENDER = process.env.RESEND_SENDER || 'AskLizy <onboarding@artikle.org>';
const RESEND_NOTIFY_SENDER = process.env.RESEND_NOTIFY_SENDER || 'AskLizy <notifications@artikle.org>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getSupabaseClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Check if user already exists
    let alreadyExists = false;
    try {
      const { data: existing } = await supabase.auth.admin.listUsers();
      alreadyExists = existing?.users?.some(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      ) ?? false;
    } catch (err) {
      console.warn('[request-access] listUsers failed, assuming new user:', err);
    }

    // Create or recover user
    if (!alreadyExists) {
      const tempPassword = crypto.randomUUID();
      const { error: createErr } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { source: 'asklizy_access_request' },
      });
      if (createErr) {
        console.error('[request-access] createUser failed:', createErr);
        return NextResponse.json(
          { error: 'Failed to create account. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Send password reset email (works for both new and existing users, uses anon key path)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${SITE_URL}/auth/callback?next=/account`,
    });

    if (resetErr) {
      console.error('[request-access] resetPasswordForEmail failed:', resetErr);
      return NextResponse.json(
        { error: 'Failed to send access email. Please try again.' },
        { status: 500 }
      );
    }

    // Send custom emails via Resend
    const resend = getResend();
    const emailResults: string[] = [];

    if (resend) {
      // 1. Welcome email to user
      try {
        await resend.emails.send({
          from: RESEND_SENDER,
          to: normalizedEmail,
          subject: 'Your AskLizy access is ready',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Welcome to AskLizy 🏠</h2>
              <p>Your full access has been activated. Check your inbox for a password reset link to set your password and log in.</p>
              <p style="margin-top: 24px;">
                <a href="${SITE_URL}/login"
                   style="display: inline-block; padding: 12px 24px; background: #1a1a1a; color: #fff;
                          text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Go to login
                </a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
                AskLizy — AI location intelligence for lease decisions.
              </p>
            </div>
          `,
        });
        emailResults.push('user_email_sent');
      } catch (err) {
        console.warn('[request-access] Failed to send user email:', err);
      }

      // 2. Notify admin
      try {
        await resend.emails.send({
          from: RESEND_NOTIFY_SENDER,
          to: ADMIN_EMAIL,
          subject: `🔔 New AskLizy access: ${normalizedEmail}`,
          html: `
            <div style="font-family: monospace; max-width: 480px; margin: 0 auto;">
              <h3>New AskLizy access request</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td><strong>${normalizedEmail}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Status</td><td>${alreadyExists ? 'Already existed (password reset sent)' : 'New account created'}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td>${new Date().toISOString()}</td></tr>
              </table>
            </div>
          `,
        });
        emailResults.push('admin_notified');
      } catch (err) {
        console.warn('[request-access] Failed to notify admin:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      alreadyExists,
      emailResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[request-access]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
