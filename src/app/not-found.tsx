import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>That page has wandered off.</h1>
      <p>Find your next story in Discover.</p>
      <Link className="button button-primary" href="/discover">
        Explore stories
      </Link>
    </div>
  );
}
