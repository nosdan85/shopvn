function getImageApiBase(apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") {
  return String(apiBase || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");
}

const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i;

function encodePathname(pathname) {
  return String(pathname || "")
    .split("/")
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join("/");
}

function isLocalhostUrl(value) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function normalizeLocalPath(value) {
  const cleanValue = String(value || "").trim().replace(/\\/g, "/");
  const hashIndex = cleanValue.indexOf("#");
  const hash = hashIndex >= 0 ? cleanValue.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? cleanValue.slice(0, hashIndex) : cleanValue;
  const queryIndex = withoutHash.indexOf("?");
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${encodePathname(normalizedPathname)}${query}${hash}`;
}

function isPublicAssetPath(value) {
  return /^(?:\/)?(?:products|pictures)\//i.test(value) || /^\/(?:favicon\.png|site-logo\.png|logo\.png)$/i.test(value);
}

function isLegacyProductFilename(value) {
  return !value.includes("/") && IMAGE_EXTENSION_PATTERN.test(value);
}

function resolveImageUrl(src, apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") {
  const cleanSrc = String(src || "").trim();
  if (!cleanSrc) return "";
  if (cleanSrc.startsWith("//")) return `https:${cleanSrc}`;
  if (isLocalhostUrl(cleanSrc)) {
    const url = new URL(cleanSrc);
    if (isPublicAssetPath(url.pathname)) {
      return normalizeLocalPath(`${url.pathname}${url.search}${url.hash}`);
    }
  }
  if (/^http:\/\//i.test(cleanSrc) && !isLocalhostUrl(cleanSrc)) {
    return cleanSrc.replace(/^http:\/\//i, "https://");
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(cleanSrc)) return cleanSrc;
  if (isLegacyProductFilename(cleanSrc)) return normalizeLocalPath(`/products/${cleanSrc}`);
  if (/^(?:[\w-]+\.)+[\w-]+(?:[/:?#]|$)/i.test(cleanSrc)) return `https://${cleanSrc}`;
  if (isPublicAssetPath(cleanSrc)) return normalizeLocalPath(cleanSrc);

  const cleanBase = getImageApiBase(apiBase);
  return `${cleanBase}${cleanSrc.startsWith("/") ? "" : "/"}${cleanSrc}`;
}

module.exports = { getImageApiBase, resolveImageUrl };
