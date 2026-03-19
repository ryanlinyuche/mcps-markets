/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@libsql/client', 'studentvue'],
  },
};

export default nextConfig;
