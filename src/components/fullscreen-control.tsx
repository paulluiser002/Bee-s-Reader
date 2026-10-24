'use client';
import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Maximize, Minimize, X } from 'lucide-react';
import { Button } from './ui/button';
const subscribe = (changed: () => void) => {
  document.addEventListener('fullscreenchange', changed);
  return () => document.removeEventListener('fullscreenchange', changed);
};
export function FullscreenControl({
  onFocusChange,
}: {
  onFocusChange: (focused: boolean) => void;
}) {
  const native = useSyncExternalStore(
    subscribe,
    () => !!document.fullscreenElement,
    () => false,
  );
  const [focused, setFocused] = useState(false);
  const [message, setMessage] = useState('');
  async function toggle() {
    if (native) {
      await document.exitFullscreen();
      return;
    }
    if (focused) {
      setFocused(false);
      onFocusChange(false);
      return;
    }
    if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        setMessage('');
        return;
      } catch {
        setMessage(
          'Fullscreen could not start. Focus mode is on; install Bee’s Reader to hide browser controls where supported.',
        );
      }
    } else
      setMessage(
        'This browser does not support page fullscreen. Focus mode is on; use Add to Home Screen for an app window.',
      );
    setFocused(true);
    onFocusChange(true);
  }
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={native ? 'Exit fullscreen' : focused ? 'Exit focus mode' : 'Enter fullscreen'}
        aria-pressed={native || focused}
        onClick={() => void toggle()}
      >
        {native || focused ? <Minimize size={20} /> : <Maximize size={20} />}
      </Button>
      {(native || focused) &&
        createPortal(
          <div className="fullscreen-controls">
            <button
              className="icon-button"
              aria-label={native ? 'Leave fullscreen' : 'Leave focus mode'}
              onClick={() => void toggle()}
            >
              <Minimize size={18} />
            </button>
            {message && (
              <div className="fullscreen-notice" role="status">
                <span>{message}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss fullscreen notice"
                  onClick={() => setMessage('')}
                >
                  <X size={17} />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
