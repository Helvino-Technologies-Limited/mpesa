/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Proxy /api calls to backend (development)
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
