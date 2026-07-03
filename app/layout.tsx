import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeaseLens — Compare local opportunity',
  description: 'Minimal location intelligence: compare two addresses by nearby POIs, ratings, reviews and recent activity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
