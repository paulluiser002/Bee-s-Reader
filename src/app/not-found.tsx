import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>That page has wandered off.</h1>
      <p>The link may be old or mistyped.</p>
      <Link className="button button-primary" href="/discover">
        Search for a story
      </Link>
    </div>
  );
}
