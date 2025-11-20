import type { NextConfig } from 'next';
 
const nextConfig = {
  // ... other configurations ...

  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          // 1. Allow any origin to access the resources (REQUIRED for your scenario)
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Replace with 'http://localhost:8081' for better security
          },
          // 2. Allow specific methods (GET, POST, PUT, DELETE, and OPTIONS)
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS',
          },
          // 3. Allow specific headers (Content-Type is crucial for POST requests)
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          // 4. Set the maximum age for preflight results (in seconds)
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;