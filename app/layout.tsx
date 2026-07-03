import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeaseLens — Compare local opportunity',
  description: 'Minimal location intelligence: compare two addresses by nearby POIs, ratings, reviews and recent activity.',
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
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
