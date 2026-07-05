'use client';

import { useEffect, useState } from 'react';
import { getLang, setLang, type Lang } from './i18n';

export function useLang() {
  const [lang, setLangState] = useState<Lang>('fr');
  useEffect(() => {
    setLangState(getLang());
  }, []);
  const changeLang = (next: Lang) => {
    setLang(next);
    setLangState(next);
  };
  return { lang, setLang: changeLang };
}
