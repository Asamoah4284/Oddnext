import { config } from "../config.js";
import { getProduct } from "../products.js";

const SMS_URL = "https://api.moolre.com/open/sms/send";

const SKIP_PHONE_KEYS = /accountnumber|account_number|secret|webhook|email|amount|reference|externalref|transaction/;

export function looksLikeGhPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return (
    (digits.startsWith("233") && digits.length === 12) ||
    (digits.startsWith("0") && digits.length === 10) ||
    (digits.length === 9 && /^[235]/.test(digits))
  );
}

export function formatPhoneForMoolre(phoneNumber: string): string {
  const clean = phoneNumber.replace(/[\s\-()]/g, "");
  let formatted = clean.startsWith("+") ? clean.slice(1) : clean;
  if (formatted.startsWith("0")) {
    formatted = `233${formatted.slice(1)}`;
  } else if (!formatted.startsWith("233")) {
    formatted = `233${formatted}`;
  }
  return formatted;
}

export function extractPayerPhone(...payloads: unknown[]): string {
  for (const payload of payloads) {
    const found = walkForPhone(payload, 0);
    if (found) return found;
  }
  return "";
}

function walkForPhone(value: unknown, depth: number): string {
  if (value == null || depth > 5) return "";
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    return looksLikeGhPhone(text) ? text : "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = walkForPhone(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const preferred = [
    "payer",
    "phonenumber",
    "phone_number",
    "phone",
    "msisdn",
    "mobile",
    "customerphone",
    "customer_phone",
    "from",
  ];
  for (const key of preferred) {
    if (!(key in record)) continue;
    const found = walkForPhone(record[key], depth + 1);
    if (found) return found;
  }
  for (const [key, item] of Object.entries(record)) {
    if (SKIP_PHONE_KEYS.test(key.toLowerCase())) continue;
    const found = walkForPhone(item, depth + 1);
    if (found) return found;
  }
  return "";
}

export type SlipLine = {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  bookingCode?: string;
};

export function buildOddsMessage(productId: string, tips: SlipLine[]): string {
  const product = getProduct(productId);
  const label = product?.label ?? "VIP";
  const lines = tips.slice(0, 8).map(
    (tip) => `${tip.homeTeam} vs ${tip.awayTeam}: ${tip.prediction} @${tip.odds}`
  );
  const codes = [
    ...new Set(tips.map((tip) => tip.bookingCode).filter(Boolean)),
  ];
  const codeLine = codes.length ? `\nCode: ${codes.join(", ")}` : "";
  return `Oddnext ${label} unlocked.\n${lines.join("\n") || "Open the site for today's slip."}${codeLine}`;
}

export async function sendMoolreSms(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  if (!config.moolre.apiKey) {
    console.warn("MOOLRE_API_KEY is not set. SMS skipped.");
    return false;
  }
  if (!phoneNumber) return false;

  const recipient = formatPhoneForMoolre(phoneNumber);
  const payload = {
    type: 1,
    senderid: config.moolre.senderId,
    messages: [{ recipient, message }],
  };

  const response = await fetch(SMS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-VASKEY": config.moolre.apiKey,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    status?: number;
    message?: string;
  };

  if (!response.ok || data.status !== 1) {
    console.error("Moolre SMS failed", data.message || response.status);
    return false;
  }
  return true;
}
