'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useRef } from 'react';

type SessionState = { loggedIn: boolean; confirmed: boolean; email?: string; plan?: string; credits?: { limit: number | null; used: number; remaining: number | null; unlimited: boolean } | null };

const PLAN_BADGE_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  free: { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: 'Free' },
  starter: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Starter' },
  pro: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Pro' },
  staff: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Staff' },
};

function PlanBadge({ plan }: { plan: string }) {
  const style = PLAN_BADGE_STYLES[plan] || PLAN_BADGE_STYLES.free;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', borderRadius: 999,
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
      padding: '1px 8px', fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {style.label}
    </span>
  );
}

function getEmailUsername(email?: string) {
  if (!email) return 'Account';
  return String(email).split('@')[0] || email;
}

export default function NavBar({ active, variant = 'marketing' }: { active?: 'compare' | 'history' | 'account'; variant?: 'marketing' | 'app' }) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isLoadingSession = session === null;

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      setSession(data || { loggedIn: false, confirmed: false, plan: 'free', credits: null });
    } catch {
      setSession({ loggedIn: false, confirmed: false, plan: 'free', credits: null });
    }
  }, []);

  useEffect(() => {
    refreshSession();
    const handleRefresh = () => refreshSession();
    window.addEventListener('asklizy:session-refresh', handleRefresh);
    return () => window.removeEventListener('asklizy:session-refresh', handleRefresh);
  }, [refreshSession]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAuthed = Boolean(session?.loggedIn && session?.confirmed);
  const plan = session?.plan || 'free';
  const username = getEmailUsername(session?.email);
  const initials = username ? username.charAt(0).toUpperCase() : '?';

  const marketingLinks = [
    { href: '/#product', label: 'Product' },
    { href: '/#pricing', label: 'Pricing' },
  ];
  const contextLinks = variant === 'marketing' ? marketingLinks : [];

  async function handleSignOut(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    setLoggingOut(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {}
    // Hard reload to clear all client state
    window.location.href = '/';
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="brand" href="/" aria-label="AskLizy">
          <span aria-hidden="true" className="material-symbols-outlined logo-icon">alt_route</span>
          <span>AskLizy</span>
        </Link>

        <div className="nav-links">
          {contextLinks.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
          {variant === 'app' && (
            <Link href="/#compare" className={active === 'compare' ? 'nav-active' : undefined}>Compare</Link>
          )}
          <Link href="/history" className={active === 'history' ? 'nav-active' : undefined}>History</Link>
          {variant === 'marketing' && <Link href="/#legal">Legal</Link>}

          {isLoadingSession ? (
            <span className="nav-auth-loading" aria-label="Checking session…" aria-live="polite" />
          ) : isAuthed ? (
            <div className="relative" ref={ref}>
              <button
                onClick={() => setOpen(!open)}
                title={session?.email}
                className="flex items-center gap-2 rounded-full hover:bg-gray-100 transition-colors py-1 pl-1 pr-2"
                style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '4px 8px 4px 4px', cursor: 'pointer', background: 'transparent', border: 'none' }}
              >
                {/* Avatar */}
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                }}>{initials}</span>
                {/* Username */}
                <span className="hidden sm:inline" style={{
                  fontSize: 12, fontFamily: 'monospace', color: '#4b5563',
                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{username}</span>
                <PlanBadge plan={plan} />
                {/* Chevron */}
                <svg style={{ width: 14, height: 14, color: '#9ca3af', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {open && (
                <div style={{
                  position: 'absolute', right: 0, marginTop: 8, width: 224,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  overflow: 'hidden', zIndex: 50,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af' }}>Signed in as</p>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</p>
                        <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.email}</p>
                      </div>
                      <PlanBadge plan={plan} />
                    </div>
                    {session?.credits && (
                      <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6' }}>
                        {session.credits.unlimited ? (
                          <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#15803d', fontWeight: 600 }}>∞ Unlimited benchmarks</p>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280' }}>Benchmarks left</span>
                              <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: session.credits.remaining === 0 ? '#dc2626' : '#111827' }}>
                                {session.credits.remaining} / {session.credits.limit}
                              </span>
                            </div>
                            <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 2,
                                width: `${session.credits.limit && session.credits.remaining != null ? (session.credits.remaining / session.credits.limit) * 100 : 0}%`,
                                background: (session.credits.remaining ?? 0) === 0 ? '#dc2626' : (session.credits.remaining ?? 0) <= 2 ? '#f59e0b' : '#22c55e',
                              }} />
                            </div>
                            <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af', marginTop: 4 }}>Resets monthly · {session.credits.used} used</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    <Link
                      href="/account"
                      onClick={() => setOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', fontSize: 14, color: '#374151', textDecoration: 'none' }}
                      className="hover:bg-gray-50"
                    >
                      <svg style={{ width: 16, height: 16, color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My account
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', fontSize: 14, color: '#374151', textDecoration: 'none' }}
                      className="hover:bg-gray-50"
                    >
                      <svg style={{ width: 16, height: 16, color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History
                    </Link>
                  </div>
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '4px 0' }}>
                    <form onSubmit={handleSignOut}>
                      <button
                        type="submit"
                        disabled={loggingOut}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                          padding: '8px 16px', fontSize: 14, color: '#dc2626',
                          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                        }}
                        className="hover:bg-red-50"
                      >
                        <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {loggingOut ? 'Signing out…' : 'Log out'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="nav-cta">Log in</Link>
          )}
        </div>

        <button
          className="nav-toggle"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>

        {mobileOpen && (
          <div className="nav-sheet">
            {contextLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</a>
            ))}
            {variant === 'app' && (
              <Link href="/#compare" onClick={() => setMobileOpen(false)}>Compare</Link>
            )}
            <Link href="/history" onClick={() => setMobileOpen(false)}>History</Link>
            {isLoadingSession ? (
              <span className="nav-sheet-loading">Checking session…</span>
            ) : isAuthed ? (
              <>
                <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                  }}>{initials}</span>
                  <PlanBadge plan={plan} />
                </div>
                <Link href="/account" onClick={() => setMobileOpen(false)}>My account · {session?.email}</Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  style={{ color: '#dc2626' }}
                >
                  {loggingOut ? 'Signing out…' : 'Log out'}
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
            )}
            {variant === 'marketing' && <Link href="/#legal" onClick={() => setMobileOpen(false)}>Legal</Link>}
          </div>
        )}
      </div>
    </nav>
  );
}
