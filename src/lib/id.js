// Safe UUID-like generator for browsers without crypto.randomUUID
// - Prefers native crypto.randomUUID
// - Falls back to RFC4122 v4 via getRandomValues
// - Finally falls back to Math.random-based variant

export function randomId() {
  try {
    const g = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {});
    const c = g.crypto || g.msCrypto;
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }
    if (c && typeof c.getRandomValues === "function") {
      const buf = new Uint8Array(16);
      c.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
      buf[8] = (buf[8] & 0x3f) | 0x80; // variant 10
      const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0"));
      return (
        hex.slice(0, 4).join("") + "-" +
        hex.slice(4, 6).join("") + "-" +
        hex.slice(6, 8).join("") + "-" +
        hex.slice(8, 10).join("") + "-" +
        hex.slice(10, 16).join("")
      );
    }
  } catch (e) {}

  // Last-resort fallback (non-crypto)
  let s = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += "-";
    else {
      const r = (Math.random() * 16) | 0;
      s += (i === 14 ? 4 : i === 19 ? (r & 0x3) | 0x8 : r).toString(16);
    }
  }
  return s;
}

