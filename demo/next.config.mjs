// @ts-check
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
  bundlePagesRouterDependencies: true,
  transpilePackages: [
    '@dynamic-labs/wagmi-connector',
    '@dynamic-labs/sdk-react-core',
    '@dynamic-labs/wallet-book'
  ],
  webpack: (config) => {
    // Deduplicate singleton packages that use React context across workspace packages.
    // Without this, packages with their own node_modules (e.g. packages/ui-v2) resolve
    // to a different wagmi/react instance than the demo app, breaking context sharing.
    const singletons = ['wagmi', 'react', 'react-dom', '@tanstack/react-query', 'viem']
    for (const pkg of singletons) {
      config.resolve.alias[pkg] = path.resolve(__dirname, `node_modules/${pkg}`)
    }
    return config
  }
}

export default nextConfig
