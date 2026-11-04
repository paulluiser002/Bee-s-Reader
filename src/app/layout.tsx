import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { LocalProvider } from '@/components/local-provider';
import { Shell } from '@/components/shell';
import { PwaRegistration } from '@/components/pwa';
const siteTitle = 'Bee’s Reader — Your little reading nook';
const description = 'A private, ad-free reading nook for manga, manhwa and manhua.';
const preview = {
  url: '/social-preview.png',
  width: 1200,
  height: 630,
  alt: 'Bee’s Reader. A honey-colored bee reading an open book.',
};
export const metadata: Metadata = {
  metadataBase: new URL('https://beesreader.vercel.app'),
  title: { default: siteTitle, template: '%s · Bee’s Reader' },
  description,
  openGraph: {
    type: 'website',
    siteName: 'Bee’s Reader',
    title: siteTitle,
    description,
    images: [preview],
  },
  twitter: { card: 'summary_large_image', title: siteTitle, description, images: [preview] },
  robots: { index: false, follow: false },
  applicationName: 'Bee’s Reader',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Bee’s Reader' },
  icons: { icon: '/icon.svg', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PwaRegistration />
        <ThemeProvider>
          <LocalProvider>
            <Shell>{children}</Shell>
          </LocalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
