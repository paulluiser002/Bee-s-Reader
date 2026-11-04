'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, Library, History, Settings, ArrowUpRight } from 'lucide-react';
import { BeeMark } from './bee-mark';
const items = [
  { href: '/', label: 'Home', icon: BookOpen },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/history', label: 'History', icon: History },
];
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <BeeMark />
      </span>
      <span>
        Bee’s <strong>Reader</strong>
        <small>Your little reading nook</small>
      </span>
    </Link>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const support = useRef<HTMLDialogElement>(null);
  if (pathname.startsWith('/read/')) return <>{children}</>;
  const links = items.map(({ href, label, icon: Icon }) => (
    <Link
      key={href}
      href={href}
      className={`nav-link ${pathname === href ? 'active' : ''}`}
      aria-current={pathname === href ? 'page' : undefined}
    >
      <Icon size={21} />
      <span>{label}</span>
    </Link>
  ));
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Desktop navigation">{links}</nav>
        <div className="sidebar-support">
          <button
            className="button button-primary"
            aria-haspopup="dialog"
            onClick={() => support.current?.showModal()}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M3 8h15v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <path d="M6 6c-2-1.5 2-2.5 0-4m4 4c-2-1.5 2-2.5 0-4m4 4c-2-1.5 2-2.5 0-4" />
            </svg>
            Buy me a coffee
          </button>
          <a className="button button-outline" href="mailto:charotreading.biz@gmail.com">
            Hire me <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
        <dialog className="support-dialog" ref={support} aria-labelledby="support-title">
          <h2 id="support-title">Buy me a coffee</h2>
          <p>Support Bee’s Reader with any QR Ph-enabled wallet or banking app.</p>
          <img
            src="/support-qr.png"
            alt="QR Ph code to support the creator"
            width={240}
            height={240}
            loading="lazy"
          />
          <div className="row">
            <a className="button button-primary" href="/support-qr.png" download>
              Download QR
            </a>
            <form method="dialog">
              <button className="button button-outline">Close</button>
            </form>
          </div>
        </dialog>
        <Link className={`nav-link ${pathname === '/settings' ? 'active' : ''}`} href="/settings">
          <Settings size={21} />
          Settings
        </Link>
        <Link className="source-link" href="/about">
          Made possible by MangaDex <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="site">
        <header className="mobile-header">
          <Brand />
          <Link className="icon-button" href="/settings" aria-label="Settings">
            <Settings size={22} />
          </Link>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="site-footer">
          <span>A little escape, one chapter at a time.</span>
          <Link href="/about">Sources & privacy</Link>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links}
      </nav>
    </>
  );
}
