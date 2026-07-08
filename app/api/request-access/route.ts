import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Check if user already exists
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some(
      (u: any) => u.email?.toLowerCase() === normalizedEmail
    );

    // Generate signup link (this also creates the user if they don't exist)
    const generatedPassword = crypto.randomUUID();
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: normalizedEmail,
      password: generatedPassword,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=/account`,
      },
    });

    if (linkError) {
      console.error('[request-access] generateLink failed:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate access link. Please try again.' },
        { status: 500 }
      );
    }

    // Send confirmation email to the user + notify admin via Resend
    const resend = getResend();
    const emailResults: string[] = [];

    if (resend) {
      // 1. Send access link to the user
      try {
        await resend.emails.send({
          from: RESEND_SENDER,
          to: normalizedEmail,
          subject: 'Your AskLizy access link',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Welcome to AskLizy 🏠</h2>
              <p>Click below to activate your full access:</p>
              <a href="${linkData.properties?.action_link || ''}"
                 style="display: inline-block; padding: 12px 24px; background: #1a1a1a; color: #fff;
                        text-decoration: none; border-radius: 8px; font-weight: 600;">
                Activate my account
              </a>
              <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
                Or copy this link:<br/>
                <code>${linkData.properties?.action_link || ''}</code>
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
          subject: `🔔 New access request: ${normalizedEmail}`,
          html: `
            <div style="font-family: monospace; max-width: 480px; margin: 0 auto;">
              <h3>New AskLizy access request</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td><strong>${normalizedEmail}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Already had account</td><td>${alreadyExists ? 'Yes (re-sent link)' : 'No (new user)'}</td></tr>
                <tr><td style="padding: 6px 0; color: #6b7280;">Time</td><td>${new Date().toISOString()}</td></tr>
              </table>
              <p style="margin-top: 16px; color: #6b7280; font-size: 13px;">
                User was sent a signup link. ${alreadyExists ? 'They already had an account — the link will confirm their email.' : 'New user — they need to confirm email before logging in.'}
              </p>
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
      alreadyExists: Boolean(alreadyExists),
      emailResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[request-access]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
