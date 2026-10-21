import type { PayCountry } from "@/lib/products";

const PHONE_KEY = "oddnext_pay_phone";
const COUNTRY_KEY = "oddnext_pay_country";

export function looksLikeGhPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return (
    (digits.startsWith("233") && digits.length === 12) ||
    (digits.startsWith("0") && digits.length === 10) ||
    (digits.length === 9 && /^[235]/.test(digits))
  );
}

export function looksLikeNgPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return (
    (digits.startsWith("234") && digits.length === 13) ||
    (digits.startsWith("0") && digits.length === 11) ||
    (digits.length === 10 && /^[789]/.test(digits))
  );
}

export function detectPayCountry(value: string): PayCountry | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 9) return null;
  if (digits.startsWith("234") || looksLikeNgPhone(value)) return "NG";
  if (digits.startsWith("233") || looksLikeGhPhone(value)) return "GH";
  return null;
}

export function looksLikePayPhone(value: string, country?: PayCountry): boolean {
  if (country === "GH") return looksLikeGhPhone(value);
  if (country === "NG") return looksLikeNgPhone(value);
  return looksLikeGhPhone(value) || looksLikeNgPhone(value);
}

export function readSavedPhone() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(PHONE_KEY) ?? "";
}

export function savePhone(phone: string) {
  sessionStorage.setItem(PHONE_KEY, phone);
}

export function readSavedCountry(): PayCountry {
  if (typeof window === "undefined") return "GH";
  return sessionStorage.getItem(COUNTRY_KEY) === "NG" ? "NG" : "GH";
}

export function saveCountry(country: PayCountry) {
  sessionStorage.setItem(COUNTRY_KEY, country);
}
