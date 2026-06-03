function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildUrl(origin, path) {
  const normalizedOrigin = normalizeUrl(origin);
  if (!normalizedOrigin) return "";
  return `${normalizedOrigin}${path}`;
}

function getDiscordAuthRedirectUri({ envRedirectUri = "", origin = "" } = {}) {
  const configured = normalizeUrl(envRedirectUri);
  if (configured) return configured;
  return buildUrl(origin, "/auth/discord/callback");
}

function getDiscordLinkRedirectUri({ envRedirectUri = "", origin = "" } = {}) {
  const configured = normalizeUrl(envRedirectUri);
  if (configured) return configured;
  return buildUrl(origin, "/lien-ket-discord/callback");
}

module.exports = {
  getDiscordAuthRedirectUri,
  getDiscordLinkRedirectUri,
};
