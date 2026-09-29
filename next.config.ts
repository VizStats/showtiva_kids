import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No "N" badge in the corner while developing: it reads like a profile
  // picture on a kids' screen. Build and runtime errors still show.
  devIndicators: false,
  // data/catalog.json is read at runtime from a path built on process.cwd(),
  // so every route that reads it lists the data folder explicitly. Without
  // this a standalone build could drop the store and fail with ENOENT.
  outputFileTracingIncludes: {
    "/": ["./data/**"],
    "/profiles": ["./data/**"],
    "/profiles/new": ["./data/**"],
    "/buddy": ["./data/**"],
    "/watch": ["./data/**"],
    "/watch/[id]": ["./data/**"],
    "/trail": ["./data/**"],
    "/friends": ["./data/**"],
    "/friends/[id]": ["./data/**"],
    "/parents": ["./data/**"],
  },
};

export default nextConfig;
