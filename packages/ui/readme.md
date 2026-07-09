# Relay

Relay is the Fastest and Cheapest Way to Bridge and Transact Across Chains.

This SDK facilitates interacting with the Relay protocol. Learn more about Relay by checking out the <a href="https://docs.relay.link">docs</a>.
Head over to the <a href="https://docs.relay.link/references/sdk/getting-started">sdk docs</a> to learn more about configuring and using the SDK in your application.
</br>
</br>

## Requirements: Relay API key + proxy

Relay Kit reads transaction history from the Requests API, which was upgraded to `GET /requests/v3`. **v3 requires a Relay API key** ([how to get one](https://docs.relay.link/references/api/api-keys#how-to-get-an-api-key)) sent via the `x-api-key` header.

Because Relay Kit's hooks (`useRequests`, `useDepositAddressStatus`) run in the browser, the API key must **not** be shipped to the client. Instead, run a lightweight proxy that injects the `x-api-key` header server-side and point Relay Kit at it via `baseApiUrl`:

```ts
createClient({
  // your proxy forwards requests to https://api.relay.link and adds `x-api-key`
  baseApiUrl: 'https://your-app.com/api/relay',
  source: 'YOUR-SOURCE'
})
```

## Contributing

Your contributions are what make the community great. We encourage you to be a part of it. Here are some important notes for contributors:

#### Preperaing Changes

**We use `changesets` to manage versioning and changelog generation.**

When contributing, please run `pnpm package:change` to create a changeset for your modifications. Be sure to include a descriptive summary for your changes; it helps us understand your contribution and makes the release process smoother.

Learn more about changesets [here](https://github.com/atlassian/changesets).

#### Getting Started

Before you start, make sure to familiarize yourself with the SDK's architecture and design principles by reading the [SDK documentation](https://docs.relay.link/references/sdk/getting-started). This will help you make meaningful contributions that align with the project's goals.

#### Pull Requests

When you're ready to contribute, submit a pull request with your changes. Our team will review your submission as soon as possible.

---

<p align="center">
  <a href="https://relay.link/">Home</a> • <a href="https://docs.relay.link">Documentation</a> • <a href="https://github.com/relayprotocol/relay-kit">GitHub</a>
</p>

<p align="center"> Made with <span style="color: #e25555;">&hearts;</span> by the team @ <a href="https://relay.link">Relay</a></p>
