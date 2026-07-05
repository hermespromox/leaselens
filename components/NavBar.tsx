'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLang } from '@/lib/useLang';
import { t } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

type SessionState = { loggedIn: boolean; confirmed: boolean; email?: string };

export default function NavBar({ active, variant = 'marketing' }: { active?: 'compare' | 'history' | 'account'; variant?: 'marketing' | 'app' }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const isLoadingSession = session === null;
  const { lang } = useLang();

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
  const marketingLinks = [
    { href: '/#product', label: t(lang, 'nav.product') },
    { href: '/#pricing', label: t(lang, 'nav.pricing') },
  ];
  const contextLinks = variant === 'marketing' ? marketingLinks : [];
  const authControl = isLoadingSession ? (
    <span className="nav-auth-loading" aria-label={t(lang, 'nav.checkingSession')} aria-live="polite" />
  ) : isAuthed ? (
    <Link href="/account" className={`nav-account ${active === 'account' ? 'nav-active' : ''}`} title={session?.email}>
      <span className="material-symbols-outlined nav-account-icon" aria-hidden="true">account_circle</span>
      <span className="nav-account-copy">
        <strong>{t(lang, 'nav.account')}</strong>
        <span>{session?.email}</span>
      </span>
    </Link>
  ) : (
    <Link href="/login" className="nav-cta">{t(lang, 'nav.login')}</Link>
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
            <Link href="/#compare" className={active === 'compare' ? 'nav-active' : undefined}>{t(lang, 'nav.compare')}</Link>
          )}
          <Link href="/history" className={active === 'history' ? 'nav-active' : undefined}>{t(lang, 'nav.history')}</Link>
          {variant === 'marketing' && <a href="/#legal">{t(lang, 'nav.legal')}</a>}
          <LanguageToggle />
          {authControl}
        </div>

        <button
          className="nav-toggle"
          aria-label={open ? t(lang, 'nav.closeMenu') : t(lang, 'nav.openMenu')}
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
              <Link href="/#compare" onClick={() => setOpen(false)}>{t(lang, 'nav.compare')}</Link>
            )}
            <Link href="/history" onClick={() => setOpen(false)}>{t(lang, 'nav.history')}</Link>
            <div style={{ padding: '8px 14px' }}><LanguageToggle /></div>
            {isLoadingSession ? (
              <span className="nav-sheet-loading">{t(lang, 'nav.checkingSession')}</span>
            ) : isAuthed ? (
              <Link href="/account" onClick={() => setOpen(false)}>{t(lang, 'nav.account')} · {session?.email}</Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>{t(lang, 'nav.login')}</Link>
            )}
            {variant === 'marketing' && <a href="/#legal" onClick={() => setOpen(false)}>{t(lang, 'nav.legal')}</a>}
          </div>
        )}
      </div>
    </nav>
  );
}
