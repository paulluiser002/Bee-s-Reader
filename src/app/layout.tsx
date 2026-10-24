import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { LocalProvider } from '@/components/local-provider';
import { Shell } from '@/components/shell';
import { PwaRegistration } from '@/components/pwa';
export const metadata: Metadata = {
  title: { default: 'Bee’s Reader — Your little reading nook', template: '%s · Bee’s Reader' },
  description: 'A private, ad-free reading nook for manga, manhwa and manhua.',
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
