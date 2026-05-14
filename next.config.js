/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      't1.gstatic.com',
      'logo.clearbit.com',
      'icons.duckduckgo.com',
    ],
  },
}

module.exports = nextConfig
