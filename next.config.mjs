/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow Microsoft Teams to embed the app in an iFrame
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.skype.com",
          },
          // Remove the default X-Frame-Options so CSP takes over
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
