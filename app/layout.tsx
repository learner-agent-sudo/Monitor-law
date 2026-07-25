import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./components/Nav";

export const metadata: Metadata = {
  title: "Privacy Law Monitor",
  description:
    "Monitor privacy laws across jurisdictions — current laws, developments, and cross-jurisdiction gap analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="footer">
          <div className="container">
            Privacy Law Monitor · AI-curated legal information · Verify against primary sources.
          </div>
        </footer>
      </body>
    </html>
  );
}
