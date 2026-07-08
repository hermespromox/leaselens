import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signUpAction } from '@/app/auth/actions';
import { getCurrentConfirmedUser } from '@/lib/supabase/server';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentConfirmedUser();
  if (user) redirect('/account');

  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>AskLizy</span></Link>
      <section className="panel auth-card">
        <p className="kicker">Start saving reports</p>
        <h1>Create account</h1>
        <p className="subtle">Keep every benchmark in your private history and reopen reports later.</p>
        {params.message && <div className="success">{params.message}</div>}
        {params.error && <div className="error">{params.error}</div>}
        <form className="form" action={signUpAction}>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <button className="primary">Create account</button>
        </form>
        <div className="auth-links"><Link href="/login">Already have an account? Log in</Link></div>
      </section>
    </main>
  );
}
