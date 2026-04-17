/**
 * Browser-compatible shim for Node's `crypto.createHash`.
 *
 * Used exclusively for template cache key generation — not for any
 * security-sensitive purpose. Uses a simple djb2-based hash.
 */

function djb2Hash(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

function toHex(n: number): string {
  return n.toString(16).padStart(8, "0");
}

interface HashObject {
  update: (data: string) => HashObject;
  digest: (encoding: string) => string;
}

export function createHash(_algorithm: string): HashObject {
  let accumulated = "";

  const obj: HashObject = {
    update(data: string): HashObject {
      accumulated += data;
      return obj;
    },
    digest(_encoding: string): string {
      return toHex(djb2Hash(accumulated));
    },
  };

  return obj;
}
