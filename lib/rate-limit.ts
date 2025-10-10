// lib/rate-limit.ts
// Quota par IP : 3 requêtes / jour (UTC). Supporte Upstash Redis si dispo, sinon fallback mémoire (utile en dev).
// Variables supportées (optionnel) :
// - UPSTASH_REDIS_REST_URL
// - UPSTASH_REDIS_REST_TOKEN

type CheckResult = {
  ok: boolean;
  remaining: number;
  resetAt: string; // ISO
};

const LIMIT_PER_DAY = 3;

// ----- Détection Redis (Upstash REST) -----
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);

// ----- Fallback mémoire (pour dev local uniquement) -----
const mem = new Map<string, { count: number; day: string }>();

// Clé jour UTC, ex: "2025-10-10"
function utcDayKey(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function clientIdFromRequest(reqHeaders: Headers): string {
  // Essaye X-Forwarded-For (Vercel), sinon Remote-Addr (proxy), sinon "unknown"
  const xff = reqHeaders.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0].trim() || reqHeaders.get("x-real-ip") || reqHeaders.get("cf-connecting-ip") || "unknown";
  return ip;
}

/**
 * Incrémente et vérifie le quota.
 * Retourne { ok, remaining, resetAt }. ok=false => quota dépassé (HTTP 429 conseillé).
 */
export async function checkAndIncrementDaily(keyBase: string): Promise<CheckResult> {
  const day = utcDayKey();
  const key = `ratelimit:${day}:${keyBase}`;
  const resetAt = new Date(Date.parse(day) + 24 * 60 * 60 * 1000).toISOString(); // jour suivant en UTC

  if (hasRedis) {
    // Upstash pipeline: INCR + EXPIRE (si nouvelle clé)
    const url = `${REDIS_URL}/pipeline`;
    const body = JSON.stringify([
      ["INCR", key],
      // EXPIRE uniquement si la clé vient d'être créée (mais on ne sait pas encore ici).
      // On met un EXPIRE systématique (réinitialisé chaque jour) de 86400s.
      ["EXPIRE", key, "86400"],
      ["GET", key],
    ]);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!resp.ok) {
      // En cas de panne Redis, on laisse passer (éviter faux positifs)
      return { ok: true, remaining: LIMIT_PER_DAY, resetAt };
    }

    const arr = (await resp.json()) as Array<{ result: number | string }>;
    const current = Number(arr?.[2]?.result ?? 1);
    const ok = current <= LIMIT_PER_DAY;
    const remaining = Math.max(0, LIMIT_PER_DAY - current);
    return { ok, remaining, resetAt };
  }

  // Fallback mémoire (process local, non persistant entre invocations serverless)
  const rec = mem.get(key) || { count: 0, day };
  if (rec.day !== day) {
    rec.count = 0;
    rec.day = day;
  }
  rec.count += 1;
  mem.set(key, rec);

  const ok = rec.count <= LIMIT_PER_DAY;
  const remaining = Math.max(0, LIMIT_PER_DAY - rec.count);
  return { ok, remaining, resetAt };
}
