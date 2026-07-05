import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AskLizy — Posez la question avant de signer le bail',
  description: 'Comparez deux adresses grâce aux POIs locaux, avis, notes, concurrence et estimations de visiteurs avant de signer un bail.',
  openGraph: {
    title: 'AskLizy',
    description: 'Intelligence de localisation par IA pour vos décisions de bail.',
    url: 'https://asklizy.com',
    siteName: 'AskLizy',
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
