import "server-only";

/**
 * Number of proxies in front of the app whose entries in `X-Forwarded-For` may
 * be trusted. On Railway that is one. Behind an additional CDN it is two.
 */
function trustedHops(): number {
  const configured = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 1;
}

/**
 * The sender's address, as far as it can be trusted.
 *
 * `X-Forwarded-For` is a list every proxy appends to. The leftmost entry is
 * whatever the client claimed, the rightmost is what our own proxy actually
 * saw — only that one is trustworthy. Reading the leftmost value would let
 * anyone reset their rate limit simply by sending the header themselves.
 */
export function clientIp(request: Request): string | null {
  const headers = request.headers;

  // Platforms that put the verified address in a single header of their own.
  const configured = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (configured) {
    const value = headers.get(configured)?.trim();
    if (value) return normalizeIp(value);
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    // Count from the right: our own proxy appended the last entry.
    const index = Math.max(0, hops.length - trustedHops());
    if (hops[index]) return normalizeIp(hops[index]);
  }

  const real = headers.get("x-real-ip")?.trim();
  if (real) return normalizeIp(real);

  return null;
}

/**
 * Brings an address into a comparable form. IPv6 is shortened to its /64
 * prefix — that is what a household gets assigned, so the individual address
 * inside it cannot be rotated to gain a fresh quota.
 */
export function normalizeIp(raw: string): string {
  let value = raw.trim().toLowerCase();

  // "[2001:db8::1]:443" → "2001:db8::1"
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end > 0) value = value.slice(1, end);
  } else if (value.split(":").length === 2) {
    // "192.0.2.1:443" → "192.0.2.1"
    value = value.split(":")[0];
  }

  // IPv4 mapped into IPv6 ("::ffff:192.0.2.1")
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];

  if (!value.includes(":")) return value;

  return ipv6Prefix(value);
}

/** First four groups of an IPv6 address — the customer's /64. */
function ipv6Prefix(value: string): string {
  const [head, tail] = value.split("::", 2);
  const left = head ? head.split(":").filter(Boolean) : [];

  let groups: string[];
  if (tail === undefined) {
    groups = left;
  } else {
    const right = tail ? tail.split(":").filter(Boolean) : [];
    const missing = Math.max(0, 8 - left.length - right.length);
    groups = [...left, ...Array<string>(missing).fill("0"), ...right];
  }

  return groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":");
}
