/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow recharts and stacks packages
  transpilePackages: ['recharts'],
  // Disable strict mode issues with @stacks
  experimental: {},
};

export default nextConfig;
