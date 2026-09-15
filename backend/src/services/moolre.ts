import { config, hasMoolreCredentials } from "../config.js";
import { extractPayerPhone } from "./sms.js";
import { HttpError } from "../utils/httpError.js";

type MoolreEnvelope<T> = {
  status: number | string;
  code?: string;
  message?: string;
  data?: T;
};

export type MoolreLinkData = {
  authorization_url?: string;
  reference?: string;
};

export type MoolreStatusData = {
  txstatus?: number;
  amount?: string | number;
  accountnumber?: string;
  transactionid?: string | number;
  id?: string | number;
  externalref?: string;
  secret?: string;
  phone?: string;
  phonenumber?: string;
  payer?: string;
  msisdn?: string;
};

const VERIFY_RETRY_DELAYS_MS = [0, 2000, 3000, 4000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function moolreOk(status: number | string | undefined): boolean {
  if (status === undefined) return true;
  return Number(status) === 1 || Number(status) === 200;
}

async function moolrePost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<MoolreEnvelope<T>> {
  const url = `${config.moolre.baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-USER": config.moolre.apiUser,
      "X-API-PUBKEY": config.moolre.publicKey,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as MoolreEnvelope<T>;
  if (!res.ok || !moolreOk(json.status)) {
    throw new HttpError(
      502,
      json.message || "Moolre request failed. Please try again."
    );
  }
  return json;
}

export async function createPaymentLink(input: {
  amount: number;
  email: string;
  externalRef: string;
  callback: string;
  redirect: string;
  phone?: string;
  currency?: "GHS" | "NGN";
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (!hasMoolreCredentials()) {
    throw new HttpError(503, "Moolre is not configured on this server");
  }

  const currency = input.currency ?? "GHS";
  const accountNumber =
    currency === "NGN" && config.moolre.ngnAccountNumber
      ? config.moolre.ngnAccountNumber
      : config.moolre.accountNumber;

  const response = await moolrePost<MoolreLinkData>("/embed/link", {
    type: 1,
    amount: Number(input.amount).toFixed(2),
    email: input.email,
    externalref: input.externalRef,
    callback: input.callback,
    redirect: input.redirect,
    reusable: "0",
    currency,
    accountnumber: accountNumber,
    ...(input.phone ? { phone: input.phone } : {}),
    metadata: input.metadata ?? {},
  });

  const url = response.data?.authorization_url;
  if (!url) {
    throw new HttpError(502, "Moolre did not return a checkout URL");
  }
  return url;
}

export async function verifyPaymentStatus(
  externalRef: string,
  options?: { retries?: number[]; accountNumber?: string }
): Promise<{
  paid: boolean;
  amount: number;
  accountNumber: string;
  transactionId: string;
  externalRef: string;
  phone: string;
  raw: MoolreStatusData;
}> {
  if (!hasMoolreCredentials()) {
    throw new HttpError(503, "Moolre is not configured on this server");
  }

  let last: MoolreStatusData = {};
  const delays = options?.retries ?? VERIFY_RETRY_DELAYS_MS;
  for (const delay of delays) {
    if (delay) await sleep(delay);
    const response = await moolrePost<MoolreStatusData>("/open/transact/status", {
      type: 1,
      idtype: 1,
      id: externalRef,
      accountnumber: options?.accountNumber || config.moolre.accountNumber,
    });
    last = response.data ?? {};
    if (Number(last.txstatus) === 1 || Number(last.txstatus) === 2) break;
  }

  return {
    paid: Number(last.txstatus) === 1,
    amount: Number(last.amount ?? 0),
    accountNumber: String(last.accountnumber ?? ""),
    transactionId: String(last.transactionid ?? last.id ?? ""),
    externalRef: String(last.externalref ?? externalRef),
    phone: extractPayerPhone(last),
    raw: last,
  };
}

export function amountsMatch(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) < 0.01;
}
