import { cache } from "../providers";

function getServiceUri(path: string) {
  return cache.get("eventServiceUri") + path;
}

export default getServiceUri;
