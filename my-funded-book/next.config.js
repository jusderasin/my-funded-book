/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/breakdown",
        destination: "/reports",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
