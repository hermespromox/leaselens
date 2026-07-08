import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const billing = read('lib/billing.ts');
const home = read('app/page.tsx');
const nav = read('components/NavBar.tsx');
const account = read('app/account/page.tsx');
const callback = read('app/auth/callback/route.ts');

assert.match(
  billing,
  /free:\s*\{[^}]*maxComparisons:\s*5\b/s,
  'Free plan must be 5 benchmarks/month in the PLANS source of truth.'
);

assert.doesNotMatch(home, /10 benchmarks\s*\/\s*month/i, 'Landing/pricing copy must not advertise 10 free benchmarks.');
assert.match(home, /5 benchmarks\s*\/\s*month/i, 'Landing/pricing copy must advertise 5 free benchmarks/month.');

assert.match(home, /credits-banner/, 'Compare form must show visible credits status, not hide it only in the navbar dropdown.');
assert.match(home, /asklizy:session-refresh/, 'Home page must refresh session/credits after a successful benchmark.');
assert.match(nav, /asklizy:session-refresh/, 'Navbar must listen for credit/session refresh events.');

assert.doesNotMatch(
  nav,
  /href=\"\/login\"[^>]*>Log out<\/Link>/s,
  'Mobile logout must actually call the signout endpoint instead of linking to /login.'
);
assert.match(nav, /\/api\/auth\/signout/, 'Navbar logout must call the signout API.');

assert.match(home, /history\/\$\{result\.storage\.id\}/, 'Saved results should link directly to the saved history detail.');
assert.doesNotMatch(account, /\?\?\s*5\b/, 'Account credits must use PLANS as source of truth, not standalone fallback limits.');

assert.match(callback, /response\.cookies\.set/s, 'Auth callback must set Supabase cookies on the redirect response object.');

console.log('AskLizy regression checks passed.');
