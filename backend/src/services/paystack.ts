import { createHmac } from "node:crypto";
import { config, hasPaystackCredentials } from "../config.js";
import { HttpError } from "../utils/httpError.js";

type PaystackEnvelope<T> = {
  status: boolean;
  message?: string;
  data?: T;
};

type PaystackInitData = {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
};

export type PaystackVerifyData = {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  customer?: {
    email?: string;
    phone?: string;
    customer_code?: string;
  };
};

const PAYSTACK_BASE = "https://api.paystack.co";

async function paystackRequest<T>(
  path: string,
  init?: RequestInit
): Promise<PaystackEnvelope<T>> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as PaystackEnvelope<T>;
  if (!res.ok || !json.status) {
    throw new HttpError(
      502,
      json.message || "Paystack request failed. Please try again."
    );
  }
  return json;
}

export function nairaToKobo(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function koboAmountsMatch(expectedNaira: number, actualKobo: number): boolean {
  return nairaToKobo(expectedNaira) === Math.round(Number(actualKobo));
}

export function verifyPaystackSignature(
  rawBody: Buffer | string,
  signature: string | string[] | undefined
): boolean {
  if (!config.paystack.secretKey || !signature) return false;
  const incoming = Array.isArray(signature) ? signature[0] : signature;
  const hash = createHmac("sha512", config.paystack.secretKey)
    .update(rawBody)
    .digest("hex");
  return hash === incoming;
}

export async function createPaystackLink(input: {
  amount: number;
  email: string;
  externalRef: string;
  callback: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (!hasPaystackCredentials()) {
    throw new HttpError(503, "Paystack is not configured on this server");
  }

  const response = await paystackRequest<PaystackInitData>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: nairaToKobo(input.amount),
        currency: "NGN",
        reference: input.externalRef,
        callback_url: input.callback,
        channels: ["card", "bank", "ussd", "bank_transfer", "mobile_money"],
        metadata: {
          ...input.metadata,
          phone: input.phone,
          custom_fields: input.phone
            ? [
                {
                  display_name: "Phone",
                  variable_name: "phone",
                  value: input.phone,
                },
              ]
            : [],
        },
      }),
    }
  );

  const url = response.data?.authorization_url;
  if (!url) {
    throw new HttpError(502, "Paystack did not return a checkout URL");
  }
  return url;
}

export async function verifyPaystackPayment(externalRef: string): Promise<{
  paid: boolean;
  amountKobo: number;
  currency: string;
  transactionId: string;
  externalRef: string;
  phone: string;
  raw: PaystackVerifyData;
}> {
  if (!hasPaystackCredentials()) {
    throw new HttpError(503, "Paystack is not configured on this server");
  }

  const response = await paystackRequest<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(externalRef)}`
  );
  const data = response.data ?? {};

  return {
    paid: data.status === "success",
    amountKobo: Number(data.amount ?? 0),
    currency: String(data.currency ?? "NGN"),
    transactionId: String(data.id ?? ""),
    externalRef: String(data.reference ?? externalRef),
    phone: String(data.customer?.phone ?? ""),
    raw: data,
  };
}
