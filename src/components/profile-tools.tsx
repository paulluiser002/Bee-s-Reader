'use client';
import { useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Download, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { useLocal } from './local-provider';
import { backupSchema } from '@/lib/browser-profile';
export function ProfileTools() {
  const local = useLocal();
  const { setTheme } = useTheme();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  function exportData() {
    try {
      const blob = new Blob([local.exportProfile()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bees-reader-profile-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Profile backup downloaded. Keep this file private.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not export this profile.');
    }
  }
  return (
    <section className="settings-section">
      <h2>Your browser profile</h2>
      <p className="muted small">
        No account or database is needed. Your library, history, and preferences stay in this
        browser on this site. Other browsers and devices have separate profiles. Clearing site data
        removes yours.
      </p>
      <div className="profile-actions">
        <Button variant="outline" disabled={!local.ready} onClick={exportData}>
          <Download size={17} />
          Export profile
        </Button>
        <Button variant="outline" disabled={!local.ready} onClick={() => input.current?.click()}>
          <Upload size={17} />
          Import profile
        </Button>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="Import profile backup"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 2 * 1024 * 1024)
                throw new Error('Profile backups must be smaller than 2 MB.');
              const text = await file.text();
              local.importProfile(text);
              setTheme(backupSchema.parse(JSON.parse(text)).preferences.theme);
              setMessage(
                'Profile imported. Saved titles and history were merged into this browser.',
              );
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Could not import this backup.');
            } finally {
              e.target.value = '';
            }
          }}
        />
      </div>
      <p role="status" className="small muted">
        {message}
      </p>
    </section>
  );
}
