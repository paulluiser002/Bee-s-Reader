'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Compass,
  Library,
  History,
  Settings,
  ArrowUpRight,
  BriefcaseBusiness,
  Coffee,
  Copy,
  X,
} from 'lucide-react';
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
  const [hire, setHire] = useState(false);
  const [feedback, setFeedback] = useState('');
  const email = 'charotreading.biz@gmail.com';
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
            className="coffee-trigger"
            aria-label="Coffee support"
            title="Buy me a coffee"
            aria-haspopup="dialog"
            onClick={() => {
              setHire(false);
              setFeedback('');
              support.current?.showModal();
            }}
          >
            <svg
              className="coffee-cup"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M3 8h15v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <path className="coffee-steam" d="M6 6c-2-1.5 2-2.5 0-4" />
              <path className="coffee-steam" d="M10 6c-2-1.5 2-2.5 0-4" />
              <path className="coffee-steam" d="M14 6c-2-1.5 2-2.5 0-4" />
            </svg>
          </button>
        </div>
        <dialog
          className="coffee-modal"
          ref={support}
          aria-labelledby="support-title"
          aria-describedby="support-description"
        >
          <form method="dialog">
            <button
              className="icon-button coffee-close"
              aria-label="Close coffee support"
              autoFocus
            >
              <X size={18} />
            </button>
          </form>
          <span className="coffee-symbol" aria-hidden="true">
            <Coffee />
          </span>
          <h2 id="support-title" className="coffee-title">
            Enjoying the readings?
          </h2>
          <p id="support-description" className="coffee-description">
            If Bee’s Reader has been helpful, consider showing some support or getting in touch for
            work opportunities.
          </p>
          <fieldset className="coffee-segments" aria-label="Support options">
            <label>
              <input
                type="radio"
                name="support-option"
                checked={!hire}
                onChange={() => setHire(false)}
              />
              <span>
                <Coffee aria-hidden="true" />
                Buy me a coffee
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="support-option"
                checked={hire}
                onChange={() => setHire(true)}
              />
              <span>
                <BriefcaseBusiness aria-hidden="true" />
                Hire me
              </span>
            </label>
          </fieldset>
          <div className="coffee-content">
            <div className="coffee-donation" hidden={hire}>
              <img
                className="coffee-qr"
                src="/support-qr.png"
                alt="QR Ph code to support the creator"
                width={256}
                height={256}
              />
              <p>
                Scan to buy me a coffee.
                <br />
                Works on all QR Ph-enabled e-wallets and mobile banks.
              </p>
              <a className="button button-outline coffee-download" href="/support-qr.png" download>
                Download QR
              </a>
            </div>
            <div className="coffee-hire" hidden={!hire}>
              <p>Have a project in mind? Let’s work together.</p>
              <div className="coffee-email">
                <input aria-label="Contact email" readOnly value={email} />
                <button
                  type="button"
                  className="button button-outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(email);
                      setFeedback('Email copied.');
                    } catch {
                      setFeedback('Select the email address to copy it manually.');
                    }
                  }}
                >
                  <Copy aria-hidden="true" />
                  Copy Email
                </button>
              </div>
              <p className="coffee-feedback" role="status">
                {feedback}
              </p>
            </div>
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
