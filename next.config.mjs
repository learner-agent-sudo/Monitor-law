/** @type {import('next').NextConfig} */

// When hosting under a sub-path (e.g. GitHub Pages project site at
// https://<user>.github.io/monitor-law/), set NEXT_PUBLIC_BASE_PATH=/monitor-law.
// For root hosting (Netlify, Cloudflare Pages, a custom domain) leave it unset.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export", // fully static site — deployable to any static host
  reactStrictMode: true,
  trailingSlash: true, // so /laws/gdpr/ resolves to index.html on plain hosts
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
