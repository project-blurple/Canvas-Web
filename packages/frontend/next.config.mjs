/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/canvas/:canvasId/@me",
        destination: "/canvas/:canvasId/me",
      },
    ];
  },
};

export default nextConfig;
