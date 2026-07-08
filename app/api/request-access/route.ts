import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const ADMIN_EMAIL = 'hermes.promox@gmail.com';

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

    const resend = getResend();
    if (!resend) {
      console.error('[request-access] RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: 'AskLizy <notifications@artikle.org>',
      to: ADMIN_EMAIL,
      subject: `🔔 Nouvelle demande d'accès : ${normalizedEmail}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Nouvelle demande AskLizy</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td><strong>${normalizedEmail}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td>${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #374151;">
            Cet utilisateur a utilisé ses 3 benchmarks gratuits et demande l'accès complet.
          </p>
        </div>
      `,
      reply_to: normalizedEmail,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('[request-access]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
