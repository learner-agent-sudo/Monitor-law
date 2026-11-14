"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Laws" },
  { href: "/requirements", label: "Requirements" },
  { href: "/gap-analysis", label: "Gap Analysis" },
  { href: "/developments", label: "Developments" },
  { href: "/policy-check", label: "Policy Check" },
  { href: "/verify", label: "Verify" },
];

/** Whether a nav link is the page being shown. The root only matches itself. */
function isCurrent(pathname: string, href: string): boolean {
  const here = pathname.replace(/\/+$/, "") || "/";
  if (href === "/") return here === "/";
  return here === href || here.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand">
          Privacy<span>Law</span> Monitor
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => {
            const current = isCurrent(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
