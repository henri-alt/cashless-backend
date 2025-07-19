import NodeCache from "node-cache";

let cache: NodeCache;

export function initCache() {
  cache = new NodeCache();
}

export function set<T = any>(key: string, value: T) {
  return cache.set(key, value);
}

export function has(key: string) {
  return cache.has(key);
}

export function get<T = unknown>(key: string) {
  return cache.get<T>(key);
}

export function del(key: string) {
  return cache.del(key);
}

export function flush() {
  return cache.flushAll();
}
