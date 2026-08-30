import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone — a self-contained server bundle with only
  // the node_modules actually needed at runtime traced in. This is what
  // lets the final Docker image skip node_modules entirely (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
