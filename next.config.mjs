/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  transpilePackages: ['studentvue'],
};

export default nextConfig;
