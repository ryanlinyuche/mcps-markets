/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  serverExternalPackages: ['studentvue'],
};

export default nextConfig;
