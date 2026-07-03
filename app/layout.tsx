import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeaseLens — Compare local opportunity',
  description: 'Minimal location intelligence: compare two addresses by nearby POIs, ratings, reviews and recent activity.',
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
