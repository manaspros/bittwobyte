/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure allowed origins for development
  experimental: {
    allowedDevOrigins: ['127.0.0.1', 'localhost'],
  },
  
  // Configure image domains
  images: {
    domains: ['lh3.googleusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig