/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ws casse une fois empaqueté par webpack (« t.mask is not a function ») : on le laisse en node_modules.
  experimental: { serverComponentsExternalPackages: ["ws"] },
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
