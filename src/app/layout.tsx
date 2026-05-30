import type {Metadata} from 'next';
import Link from 'next/link';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'German Vocabulary TikTok Builder',
  description: 'Local Remotion tool for German vocabulary TikTok videos',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>
        <nav className="appNav">
          <Link href="/">Video Builder</Link>
          <Link href="/posts">Post Images</Link>
          <Link href="/formal-contrast">Formal Contrast</Link>
          <Link href="/opengraph">OpenGraph</Link>
          <Link href="/engagement-card">End Card</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
