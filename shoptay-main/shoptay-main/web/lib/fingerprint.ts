export async function getDeviceFingerprintHash() {
  if (typeof window === "undefined") return "";

  const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
  const fp = await FingerprintJS.default.load();
  const result = await fp.get();
  const source = [
    result.visitorId,
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(window.screen?.width || ""),
    String(window.screen?.height || ""),
    String(window.screen?.colorDepth || ""),
  ].join("|");

  const encoded = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
