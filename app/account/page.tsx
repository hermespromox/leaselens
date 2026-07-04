import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/auth/actions';
import { getCurrentUser } from '@/lib/supabase/server';

export default async function AccountPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?message=Log in to access your account.');

  return (
    <main>
      <nav className="nav">
        <Link className="brand" href="/"><span className="material-symbols-outlined logo-icon">alt_route</span><span>LeaseLens</span></Link>
        <div><Link href="/history">History</Link><Link href="/account">Account</Link></div>
      </nav>
      <section className="shell account-grid">
        <div className="panel account-card">
          <p className="kicker">Account</p>
          <h1>Your workspace</h1>
          {searchParams.message && <div className="success">{searchParams.message}</div>}
          {searchParams.error && <div className="error">{searchParams.error}</div>}
          <div className="detail-list">
            <div><span>Email</span><strong>{user.email}</strong></div>
            <div><span>User ID</span><strong>{user.id}</strong></div>
          </div>
          <div className="hero-actions">
            <Link className="secondary-link" href="/update-password">Change password</Link>
            <form action={logoutAction}><button className="primary">Log out</button></form>
          </div>
        </div>
      </section>
    </main>
  );
}
