import Link from 'next/link';
import { resetPasswordAction } from '@/app/auth/actions';
import { getLang, t } from '@/lib/i18n';

export default function ResetPasswordPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const lang = getLang();
  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>AskLizy</span></Link>
      <section className="panel auth-card">
        <p className="kicker">{t(lang, 'auth.passwordRecovery')}</p>
        <h1>{t(lang, 'auth.resetPassword')}</h1>
        <p className="subtle">{t(lang, 'auth.resetPasswordSub')}</p>
        {searchParams.message && <div className="success">{searchParams.message}</div>}
        {searchParams.error && <div className="error">{searchParams.error}</div>}
        <form className="form" action={resetPasswordAction}>
          <label>{t(lang, 'auth.email')}<input name="email" type="email" autoComplete="email" required /></label>
          <button className="primary">{t(lang, 'auth.sendResetLink')}</button>
        </form>
        <div className="auth-links"><Link href="/login">{t(lang, 'auth.backToLogin')}</Link></div>
      </section>
    </main>
  );
}
