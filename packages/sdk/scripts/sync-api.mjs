import fs from 'node:fs'
import openapiTS, { astToString } from 'openapi-typescript'
import fetch from 'node-fetch'
import path from 'path'
import { pathToFileURL } from 'node:url'

const OPENAPI_URL = "https://api.relay.link/documentation/json"

const inlineRequiredOnlyBranches = (node) => {
  if (Array.isArray(node)) return node.map(inlineRequiredOnlyBranches)
  if (!node || typeof node !== 'object') return node
  const schema = Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      inlineRequiredOnlyBranches(value)
    ])
  )
  for (const key of ['oneOf', 'anyOf']) {
    if (!schema[key] || !schema.properties) continue
    schema[key] = schema[key].map((branch) =>
      branch.required && !branch.properties
        ? {
            ...branch,
            properties: Object.fromEntries(
              branch.required.map((name) => [name, schema.properties[name]])
            )
          }
        : branch
    )
  }
  return schema
}

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
  const output = astToString(
    await openapiTS(inlineRequiredOnlyBranches(openapiSchema))
  )
  fs.writeFileSync(path.join(typesDir, 'api.ts'), output)
}

generateTypes()
