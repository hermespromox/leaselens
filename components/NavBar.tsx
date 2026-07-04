'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SessionState = { loggedIn: boolean; confirmed: boolean; email?: string };

const NAV_LINKS = [
  { href: '/#product', label: 'Product' },
  { href: '/#pricing', label: 'Pricing' },
];

export default function NavBar({ active }: { active?: 'compare' | 'history' | 'account' }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);

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

  return (
    <nav className="nav">
      <Link className="brand" href="/" aria-label="LeaseLens">
        <span aria-hidden="true" className="material-symbols-outlined logo-icon">alt_route</span>
        <span>LeaseLens</span>
      </Link>

      <div className="nav-links">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
        <Link href="/history" className={active === 'history' ? 'nav-active' : undefined}>History</Link>
        {isAuthed ? (
          <Link href="/account" className={`nav-account ${active === 'account' ? 'nav-active' : ''}`}>
            <span className="material-symbols-outlined nav-account-icon">account_circle</span>
            {session?.email}
          </Link>
        ) : (
          <Link href="/login" className="nav-cta">Log in</Link>
        )}
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
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <Link href="/history" onClick={() => setOpen(false)}>History</Link>
          {isAuthed ? (
            <Link href="/account" onClick={() => setOpen(false)}>Account · {session?.email}</Link>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
          )}
          <a href="/#legal" onClick={() => setOpen(false)}>Legal</a>
        </div>
      )}
    </nav>
  );
}
