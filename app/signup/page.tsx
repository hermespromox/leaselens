import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signUpAction } from '@/app/auth/actions';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';
import { getLang, t } from '@/lib/i18n';

export default async function SignupPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const user = await getCurrentConfirmedUser();
  if (user) redirect('/account');
  const lang = getLang();

  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>AskLizy</span></Link>
      <section className="panel auth-card">
        <p className="kicker">{t(lang, 'auth.startSavingReports')}</p>
        <h1>{t(lang, 'auth.createAccount')}</h1>
        <p className="subtle">{t(lang, 'auth.createAccountSub')}</p>
        {searchParams.message && <div className="success">{searchParams.message}</div>}
        {searchParams.error && <div className="error">{searchParams.error}</div>}
        <form className="form" action={signUpAction}>
          <label>{t(lang, 'auth.email')}<input name="email" type="email" autoComplete="email" required /></label>
          <label>{t(lang, 'auth.password')}<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label>{t(lang, 'auth.confirmPassword')}<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <button className="primary">{t(lang, 'auth.createAccount')}</button>
        </form>
        <div className="auth-links"><Link href="/login">{t(lang, 'auth.alreadyHaveAccount')}</Link></div>
      </section>
    </main>
  );
}
