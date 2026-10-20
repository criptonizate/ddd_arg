/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mgxycajfblrnyzzshaqs.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'mgxycajfblrnyzzshaqs.supabase.co',
        pathname: '/storage/v1/render/image/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
