import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync } from 'fs';

await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'dist/index.js',
    external: [
        '@prisma/client',
        '@prisma/adapter-pg',
    ],
    // ✅ This fixes "Dynamic require is not supported" for CJS deps like dotenv
    banner: {
        js: `import { createRequire as _cr } from 'module'; const require = _cr(import.meta.url);`,
    },
});

const code = readFileSync('dist/index.js', 'utf8');
const result = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    identifierNamesGenerator: 'hexadecimal',
    selfDefending: true,
    stringArray: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
});
writeFileSync('dist/index.js', result.getObfuscatedCode(), 'utf8');
console.log('Build + obfuscation complete!');