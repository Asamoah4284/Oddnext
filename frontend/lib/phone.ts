const PHONE_KEY = "oddnext_pay_phone";

export function looksLikeGhPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return (
    (digits.startsWith("233") && digits.length === 12) ||
    (digits.startsWith("0") && digits.length === 10) ||
    (digits.length === 9 && /^[235]/.test(digits))
  );
}

export function readSavedPhone() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(PHONE_KEY) ?? "";
}

export function savePhone(phone: string) {
  sessionStorage.setItem(PHONE_KEY, phone);
}
