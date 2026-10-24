import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { LocalProvider } from '@/components/local-provider';
import { Shell } from '@/components/shell';
export const metadata: Metadata = {
  title: { default: 'Bee’s Reader — Your little reading nook', template: '%s · Bee’s Reader' },
  description: 'A private, ad-free reading nook for manga, manhwa and manhua.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LocalProvider>
            <Shell>{children}</Shell>
          </LocalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
