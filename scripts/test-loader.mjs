import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
const source = fileURLToPath(new URL('../src/', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/') ? resolve(source, specifier.slice(2)) : resolve(dirname(fileURLToPath(context.parentURL)), specifier);
      for (const suffix of ['', '.ts', '.tsx', '/index.ts']) {
        if (existsSync(base + suffix)) return nextResolve(pathToFileURL(base + suffix).href, context);
      }
    }
    return nextResolve(specifier, context);
  }
});
