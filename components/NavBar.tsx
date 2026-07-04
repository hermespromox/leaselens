'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SessionState = { loggedIn: boolean; confirmed: boolean; email?: string };

const MARKETING_LINKS = [
  { href: '/#product', label: 'Product' },
  { href: '/#pricing', label: 'Pricing' },
];

export default function NavBar({ active, variant = 'marketing' }: { active?: 'compare' | 'history' | 'account'; variant?: 'marketing' | 'app' }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const isLoadingSession = session === null;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setSession(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthed = Boolean(session?.loggedIn && session?.confirmed);
  const contextLinks = variant === 'marketing' ? MARKETING_LINKS : [];
  const authControl = isLoadingSession ? (
    <span className="nav-auth-loading" aria-label="Checking session" aria-live="polite" />
  ) : isAuthed ? (
    <Link href="/account" className={`nav-account ${active === 'account' ? 'nav-active' : ''}`} title={session?.email}>
      <span className="material-symbols-outlined nav-account-icon" aria-hidden="true">account_circle</span>
      <span className="nav-account-copy">
        <strong>Account</strong>
        <span>{session?.email}</span>
      </span>
    </Link>
  ) : (
    <Link href="/login" className="nav-cta">Log in</Link>
  );

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
          {variant === 'marketing' && <a href="/#legal">Legal</a>}
          {authControl}
        </div>

        <button
          className="nav-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="material-symbols-outlined">{open ? 'close' : 'menu'}</span>
        </button>

        {open && (
          <div className="nav-sheet">
            {contextLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
            ))}
            {variant === 'app' && (
              <Link href="/#compare" onClick={() => setOpen(false)}>Compare</Link>
            )}
            <Link href="/history" onClick={() => setOpen(false)}>History</Link>
            {isLoadingSession ? (
              <span className="nav-sheet-loading">Checking session…</span>
            ) : isAuthed ? (
              <Link href="/account" onClick={() => setOpen(false)}>Account · {session?.email}</Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
            )}
            {variant === 'marketing' && <a href="/#legal" onClick={() => setOpen(false)}>Legal</a>}
          </div>
        )}
      </div>
    </nav>
  );
}
