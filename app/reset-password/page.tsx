import Link from 'next/link';
import { resetPasswordAction } from '@/app/auth/actions';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>AskLizy</span></Link>
      <section className="panel auth-card">
        <p className="kicker">Password recovery</p>
        <h1>Reset password</h1>
        <p className="subtle">Enter your email. We&apos;ll send you a secure password reset link.</p>
        {params.message && <div className="success">{params.message}</div>}
        {params.error && <div className="error">{params.error}</div>}
        <form className="form" action={resetPasswordAction}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <button className="primary">Send reset link</button>
        </form>
        <div className="auth-links"><Link href="/login">Back to login</Link></div>
      </section>
    </main>
  );
}
