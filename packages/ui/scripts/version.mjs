import { writeFileSync } from 'fs';
import { resolve } from 'path';
import packageJson from '../package.json' with { type: "json" };

const version = packageJson.version;
const content = `export const UI_VERSION = '${version}';\n`;

writeFileSync(resolve('src/version.ts'), content);

console.log(`✅ Generated ui kit version.ts with version: ${version}`);