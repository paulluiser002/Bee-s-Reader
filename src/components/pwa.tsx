'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => console.warn('Bee’s Reader offline fallback could not be registered.'));
    }
  }, []);
  return null;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(media.matches);
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    update();
    media.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', done);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  return (
    <section className="settings-section">
      <h2>Take your nook with you</h2>
      <p className="muted small">
        Install Bee’s Reader for an app window and a Home Screen shortcut. Stories still need an
        internet connection.
      </p>
      {installed ? (
        <p className="small">
          <Smartphone size={18} style={{ display: 'inline', verticalAlign: 'middle' }} /> You’re
          using the installed app.
        </p>
      ) : (
        <>
          <Button
            variant="outline"
            onClick={async () => {
              if (prompt) {
                try {
                  await prompt.prompt();
                  const choice = await prompt.userChoice;
                  setMessage(
                    choice.outcome === 'accepted'
                      ? 'Installation requested.'
                      : 'You can install later from your browser menu.',
                  );
                  setPrompt(null);
                } catch {
                  setMessage(
                    'Open your browser menu and choose Install app or Add to Home Screen.',
                  );
                }
              } else
                setMessage(
                  'On iPhone or iPad: open Safari’s Share menu, then Add to Home Screen and Open as Web App if offered. On Android or desktop: open your browser menu and choose Install app or Add to Home Screen.',
                );
            }}
          >
            <Download size={17} />
            Install Bee’s Reader
          </Button>
          <p className="muted small" role="status">
            {message}
          </p>
        </>
      )}
    </section>
  );
}
