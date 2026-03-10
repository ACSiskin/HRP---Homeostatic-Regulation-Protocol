/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Kluczowe: Wykluczamy biblioteki Puppeteera z procesu bundlowania Next.js
    serverComponentsExternalPackages: [
      'puppeteer-core',
      'puppeteer', 
      'puppeteer-extra', 
      'puppeteer-extra-plugin-stealth'
    ],
  },
  webpack: (config) => {
    // Dodatkowe wykluczenia dla natywnych modułów Node.js
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    return config
  },
};

export default nextConfig;
