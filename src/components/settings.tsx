'use client';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { Sun, Moon, Monitor, ArrowUpRight, Check, Trash2 } from 'lucide-react';
import { useLocal } from './local-provider';
import { Button } from './ui/button';
import { clientJSON } from '@/lib/client';
import type { Preferences } from '@/lib/schemas';
export function Settings() {
  const local = useLocal();
  const { theme, setTheme } = useTheme();
  const activeTheme = local.ready ? theme : undefined;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const p = local.state.preferences;
  async function update(patch: Partial<Preferences>) {
    setBusy(true);
    setMessage('');
    try {
      await local.setPreferences({ ...p, ...patch });
      if (patch.theme) setTheme(patch.theme);
      setMessage('Preferences saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save preferences.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your nook, your way.</h1>
          <p>Little adjustments for a better reading ritual.</p>
        </div>
      </div>
      {local.error && (
        <p className="notice" role="alert">
          {local.error}
        </p>
      )}
      <div className="settings-content">
        <section className="settings-section">
          <h2>Appearance</h2>
          <p className="muted small">Set the mood for your next chapter.</p>
          <div className="theme-options">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`theme-option ${activeTheme === id ? 'selected' : ''}`}
                aria-pressed={activeTheme === id}
                disabled={busy || !local.ready}
                onClick={() => update({ theme: id as Preferences['theme'] })}
              >
                <Icon size={23} />
                <span>{label}</span>
                {activeTheme === id && <Check size={14} />}
              </button>
            ))}
          </div>
        </section>
        <section className="settings-section">
          <h2>Reading</h2>
          <div className="setting-row">
            <div>
              <h3>Reading mode</h3>
              <p>Pages flow from top to bottom, with no gaps.</p>
            </div>
            <span className="badge">Continuous</span>
          </div>
          <label className="setting-row">
            <div>
              <h3>Image quality</h3>
              <p>Data saver uses less bandwidth.</p>
            </div>
            <select
              aria-label="Default image quality"
              value={p.quality}
              disabled={busy || !local.ready}
              onChange={(e) => update({ quality: e.target.value as Preferences['quality'] })}
            >
              <option value="data-saver">Data saver</option>
              <option value="original">Original</option>
            </select>
          </label>
          <label className="setting-row">
            <div>
              <h3>Page width</h3>
              <p>Images always keep their proportions.</p>
            </div>
            <div className="width-setting">
              <span>{p.pageWidthPercent}%</span>
              <input
                type="range"
                aria-label="Default page width"
                min="50"
                max="100"
                step="5"
                defaultValue={p.pageWidthPercent}
                key={p.pageWidthPercent}
                disabled={busy || !local.ready}
                onPointerUp={(e) => update({ pageWidthPercent: Number(e.currentTarget.value) })}
                onKeyUp={(e) => update({ pageWidthPercent: Number(e.currentTarget.value) })}
              />
            </div>
          </label>
          <label className="setting-row">
            <div>
              <h3>Auto-next chapter</h3>
              <p>Continue after you reach the end. Cancel anytime.</p>
            </div>
            <input
              className="switch"
              type="checkbox"
              role="switch"
              aria-label="Auto-next chapter"
              checked={p.autoNext}
              disabled={busy || !local.ready}
              onChange={(e) => update({ autoNext: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <div>
              <h3>Reading language</h3>
              <p>Used when browsing available translations.</p>
            </div>
            <select
              aria-label="Default reading language"
              value={p.language}
              disabled={busy || !local.ready}
              onChange={(e) => update({ language: e.target.value as Preferences['language'] })}
            >
              {[
                ['en', 'English'],
                ['es', 'Spanish'],
                ['es-la', 'Spanish (LATAM)'],
                ['fr', 'French'],
                ['pt-br', 'Portuguese (BR)'],
                ['id', 'Indonesian'],
                ['de', 'German'],
                ['ru', 'Russian'],
                ['vi', 'Vietnamese'],
                ['ja', 'Japanese'],
                ['ko', 'Korean'],
                ['zh', 'Chinese'],
                ['zh-hk', 'Chinese (HK)'],
                ['it', 'Italian'],
                ['uk', 'Ukrainian'],
              ].map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="settings-section">
          <h2>Your data</h2>
          <div className="setting-row">
            <div>
              <h3>Reading history</h3>
              <p>Stored only in this app’s local database.</p>
            </div>
            <Button variant="outline" onClick={() => setConfirm(true)}>
              <Trash2 size={16} />
              Clear
            </Button>
          </div>
          {confirm && (
            <div className="confirmation" role="group" aria-label="Clear reading history">
              <h3>Clear your reading history?</h3>
              <p>
                This removes all chapter progress and resume positions. Your library and preferences
                stay saved.
              </p>
              <div className="row">
                <Button
                  onClick={async () => {
                    try {
                      await clientJSON('/api/local/history', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ confirm: true }),
                      });
                      local.reload();
                      setConfirm(false);
                      setMessage('Reading history cleared.');
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : 'Could not clear history.');
                    }
                  }}
                >
                  Clear history
                </Button>
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Keep history
                </Button>
              </div>
            </div>
          )}
        </section>
        <p role="status" className="save-status">
          {busy ? 'Saving…' : message}
        </p>
        <a href="/about" className="source-link">
          About Bee’s Reader & its sources
          <ArrowUpRight size={14} />
        </a>
      </div>
    </>
  );
}
