const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref_src",
]);

export function normalizeSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new SourceUrlError("Enter a complete public source URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new SourceUrlError("Use a public HTTP or HTTPS source URL.");
  }
  if (url.username || url.password) {
    throw new SourceUrlError("Source links cannot contain sign-in details.");
  }
  if (unsafeHostname(url.hostname)) {
    throw new SourceUrlError("Use a public source page, not a private address.");
  }
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (
      key.toLowerCase().startsWith("utm_") ||
      trackingParameters.has(key.toLowerCase())
    ) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString();
}

function unsafeHostname(value: string) {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::" ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    /^fe[89ab]/.test(hostname)
  ) {
    return true;
  }
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) ||
    (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 198 && octets[1] >= 18 && octets[1] <= 19) ||
    (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
    (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) ||
    octets[0] === 0 ||
    octets[0] >= 224
  );
}

export class SourceUrlError extends Error {}
