import path from 'node:path';

function cleanPath(value: string | undefined): string {
  return String(value || '').trim();
}

export function cacheDirectory(name: string, legacyDotName: string): string {
  const cacheRoot = cleanPath(process.env.AUDIOFILMS_CACHE_DIR);
  if (cacheRoot) {
    return path.resolve(cacheRoot, name);
  }

  return path.join(process.cwd(), legacyDotName);
}

export function dataDirectory(name: string, legacyDotName: string): string {
  const dataRoot = cleanPath(process.env.AUDIOFILMS_DATA_DIR);
  if (dataRoot) {
    return path.resolve(dataRoot, name);
  }

  return path.join(process.cwd(), legacyDotName);
}
