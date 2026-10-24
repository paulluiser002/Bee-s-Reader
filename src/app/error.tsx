'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-state" role="alert">
      <h1>This page couldn’t load.</h1>
      <p>Please check your connection and try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
