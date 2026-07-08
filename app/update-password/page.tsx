import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updatePasswordAction } from '@/app/auth/actions';
import { getCurrentUser } from '@/lib/supabase/server';

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login?message=Please log in from your reset link to update your password.');

  return (
    <main className="auth-shell">
      <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>AskLizy</span></Link>
      <section className="panel auth-card">
        <p className="kicker">Security</p>
        <h1>Update password</h1>
        {params.message && <div className="success">{params.message}</div>}
        {params.error && <div className="error">{params.error}</div>}
        <form className="form" action={updatePasswordAction}>
          <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <button className="primary">Update password</button>
        </form>
        <div className="auth-links"><Link href="/account">Back to account</Link></div>
      </section>
    </main>
  );
}
