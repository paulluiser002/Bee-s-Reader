'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, Library, History, Settings, Hexagon, ArrowUpRight } from 'lucide-react';
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
        <Hexagon size={31} strokeWidth={1.8} />
        <BookOpen className="brand-book" size={17} />
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
        <div className="sidebar-note">
          <BookOpen size={27} />
          <p>
            A good story.
            <br />A little time for you.
          </p>
        </div>
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
