// @ts-check

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
  // TonConnect wallets fetch the manifest cross-origin, so it must be served
  // with CORS enabled — otherwise the wallet throws "App manifest error" even
  // though the file loads fine in a browser tab.
  async headers() {
    return [
      {
        source: '/tonconnect-manifest.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' }
        ]
      }
    ]
  }
}

export default nextConfig
