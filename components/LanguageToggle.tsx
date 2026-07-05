'use client';

import { useLang } from '@/lib/useLang';
import { useRouter } from 'next/navigation';

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  const router = useRouter();

  function switchTo(next: 'fr' | 'en') {
    if (next === lang) return;
    setLang(next);
    router.refresh();
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={lang === 'fr' ? 'lang-btn lang-active' : 'lang-btn'}
        onClick={() => switchTo('fr')}
        aria-pressed={lang === 'fr'}
      >
        FR
      </button>
      <button
        type="button"
        className={lang === 'en' ? 'lang-btn lang-active' : 'lang-btn'}
        onClick={() => switchTo('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
