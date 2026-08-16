import Link from "next/link";

export function Nav() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          Privacy<span>Law</span> Monitor
        </Link>
        <nav className="nav">
          <Link href="/">Laws</Link>
          <Link href="/requirements">Requirements</Link>
          <Link href="/gap-analysis">Gap Analysis</Link>
          <Link href="/developments">Developments</Link>
          <Link href="/policy-check">Policy Check</Link>
          <Link href="/verify">Verify</Link>
        </nav>
      </div>
    </header>
  );
}
