import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship browser source maps in production so a minified runtime error
  // (e.g. the "Cannot read properties of undefined" crashes) maps back to
  // the real file/line in DevTools instead of an opaque hashed chunk.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
