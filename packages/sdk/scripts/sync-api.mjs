import fs from 'node:fs'
import openapiTS from 'openapi-typescript'
import fetch from 'node-fetch'
import path from 'path'
import { pathToFileURL } from 'node:url'

const OPENAPI_URL = "https://api.relay.link/documentation/json"

// The Relay OpenAPI schema generates the /lives `report` object with a
// `version?: string` property alongside a `[key: string]` index signature whose
// value type excludes `string`, which TypeScript rejects (TS2411). Widen the
// index value to include `string` so the generated types compile. Idempotent:
// once patched the source no longer matches, so re-runs are a no-op.
const patchGeneratedTypes = (source) =>
  source.replace(
    /(version\?: string;\s*)\[key: string\]: \(\{(\s*status\?: string;\s*reason\?: string \| null;\s*)\}\) \| undefined;/g,
    '$1[key: string]: string | ({$2}) | undefined;'
  )

const generateTypes = async () => {
  // Fetch the OpenAPI schema
  const response = await fetch(OPENAPI_URL)
  const openapiSchema = await response.json()
  const __filename = pathToFileURL(import.meta.url);

  // Extract routes
  const routes = Object.keys(openapiSchema.paths).filter(
    (path) => !path.includes('admin')
  )
  const currentFileURL = new URL(import.meta.url);
  const currentDir = path.dirname(currentFileURL.pathname);
  const routesDir = path.join(currentDir, '../src/routes');
  fs.writeFileSync(
    path.join(routesDir, 'index.ts'),
    `export const routes = ${JSON.stringify(routes, null, 2)};`
  )

  const typesDir = path.join(currentDir, '../src/types');
  const output = await openapiTS(OPENAPI_URL)
  const patched =
    typeof output === 'string' ? patchGeneratedTypes(output) : output
  fs.writeFileSync( path.join(typesDir, 'api.ts'), patched)
}

generateTypes()
