import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updatePasswordAction } from '@/app/auth/actions';
import { getCurrentUser } from '@/lib/supabase/server';
import { getLang, t } from '@/lib/i18n';

export default async function UpdatePasswordPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const user = await getCurrentUser();
  const lang = getLang();
  if (!user) redirect(`/login?message=${encodeURIComponent(t(lang, 'auth.pleaseLoginReset'))}`);

  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>AskLizy</span></Link>
      <section className="panel auth-card">
        <p className="kicker">{t(lang, 'auth.security')}</p>
        <h1>{t(lang, 'auth.updatePassword')}</h1>
        {searchParams.message && <div className="success">{searchParams.message}</div>}
        {searchParams.error && <div className="error">{searchParams.error}</div>}
        <form className="form" action={updatePasswordAction}>
          <label>{t(lang, 'auth.newPassword')}<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label>{t(lang, 'auth.confirmNewPassword')}<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <button className="primary">{t(lang, 'auth.updatePassword')}</button>
        </form>
        <div className="auth-links"><Link href="/account">{t(lang, 'auth.backToAccount')}</Link></div>
      </section>
    </main>
  );
}
