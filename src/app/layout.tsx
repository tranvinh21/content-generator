import type {Metadata} from 'next';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import {AppShell} from '../components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'German Vocabulary TikTok Builder',
  description: 'Local Remotion tool for German vocabulary TikTok videos',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
