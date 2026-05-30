/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // `npm run typecheck` remains the authoritative type gate.
    ignoreBuildErrors: true
  },
  experimental: {
    cpus: 1,
    workerThreads: true,
    webpackBuildWorker: false,
    staticGenerationMaxConcurrency: 1
  }
};

export default nextConfig;
