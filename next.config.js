/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Configure allowed origins for development
  experimental: {
    allowedDevOrigins: ['127.0.0.1', 'localhost', '0.0.0.0', '172.16.91.62'],
  },
  
  // Configure image domains using remotePatterns
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  
  // Memory optimization settings
  webpack: (config, { isServer }) => {
    // Optimize memory usage
    config.optimization.moduleIds = 'deterministic';
    
    // Reduce bundle size
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000
      };
    }
    
    // Disable source maps in production
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }
    
    return config;
  },
  
  // Reduce memory usage for the build process
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 15 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig