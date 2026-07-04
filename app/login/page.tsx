import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/auth/actions';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';

export default async function LoginPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const user = await getCurrentConfirmedUser();
  if (user) redirect('/account');

  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>LeaseLens</span></Link>
      <section className="panel auth-card">
        <p className="kicker">Welcome back</p>
        <h1>Log in</h1>
        <p className="subtle">Access your saved location benchmarks and continue your lease analysis workflow.</p>
        {searchParams.message && <div className="success">{searchParams.message}</div>}
        {searchParams.error && <div className="error">{searchParams.error}</div>}
        <form className="form" action={loginAction}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="primary">Log in</button>
        </form>
        <div className="auth-links">
          <Link href="/signup">Create an account</Link>
          <Link href="/reset-password">Forgot password?</Link>
        </div>
      </section>
    </main>
  );
}
