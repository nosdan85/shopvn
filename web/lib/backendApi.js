function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";
  return String(raw).trim().replace(/\/+$/, "").replace(/\/api$/, "");
}

function backendUrl(path) {
  const cleanPath = `/${String(path || "").replace(/^\/+/, "")}`;
  return `${getApiBaseUrl()}${cleanPath}`;
}

function noStoreHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...extra,
  };
}

module.exports = { backendUrl, getApiBaseUrl, noStoreHeaders };
