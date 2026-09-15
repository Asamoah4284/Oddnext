"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { CheckoutSession } from "@/components/MoolreCheckout";
import { apiFetch } from "@/lib/api";
import {
  ackSlip,
  clearPayRef,
  storePayRef,
  type PaymentVerify,
} from "@/lib/payments";
import {
  detectPayCountry,
  looksLikePayPhone,
  readSavedCountry,
  readSavedPhone,
  saveCountry,
  savePhone,
} from "@/lib/phone";
import type { PayCountry, ProductId } from "@/lib/products";
import type { AuthUser } from "@/lib/types";

export function useMoolrePay() {
  const { token, user, applySession, refresh } = useAuth();
  const [busy, setBusy] = useState<ProductId | "">("");
  const [error, setError] = useState("");
  const [phone, setPhoneValue] = useState("");
  const [country, setCountryValue] = useState<PayCountry>("GH");
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [paid, setPaid] = useState<PaymentVerify | null>(null);

  useEffect(() => {
    const saved = readSavedPhone();
    const savedCountry = readSavedCountry();
    if (saved) {
      setPhoneValue(saved);
      setCountryValue(detectPayCountry(saved) ?? savedCountry);
      return;
    }
    setCountryValue(savedCountry);
    if (user?.phone) {
      setPhoneValue(user.phone);
      const detected = detectPayCountry(user.phone);
      if (detected) setCountryValue(detected);
    }
  }, [user?.phone]);

  const setPhone = useCallback((value: string) => {
    setPhoneValue(value);
    const detected = detectPayCountry(value);
    if (detected) {
      setCountryValue(detected);
      saveCountry(detected);
    }
  }, []);

  const setCountry = useCallback((next: PayCountry) => {
    setCountryValue(next);
    saveCountry(next);
  }, []);

  useEffect(() => {
    return () => {
      setPaid(null);
      clearPayRef();
    };
  }, []);

  const startPay = useCallback(
    async (product: ProductId) => {
      if (!looksLikePayPhone(phone, country)) {
        setError(
          country === "NG"
            ? "Enter a valid Nigeria Mobile Money number."
            : "Enter a valid Ghana Mobile Money number."
        );
        return;
      }
      setBusy(product);
      setError("");
      setPaid(null);
      savePhone(phone);
      saveCountry(country);
      try {
        const data = await apiFetch<{
          authorization_url: string;
          reference: string;
          token?: string;
          user?: AuthUser;
        }>("/api/payments/initiate", {
          method: "POST",
          token,
          body: JSON.stringify({
            product,
            phone,
            country,
            returnOrigin: window.location.origin,
          }),
        });
        const nextToken = data.token ?? token;
        if (data.token && data.user) {
          applySession(data.token, data.user);
        }
        if (!data.authorization_url || !data.reference) {
          throw new Error("Checkout did not return a payment link.");
        }
        storePayRef(data.reference);
        setCheckout({
          authorizationUrl: data.authorization_url,
          reference: data.reference,
          token: nextToken ?? null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start payment");
      } finally {
        setBusy("");
      }
    },
    [token, applySession, phone, country]
  );

  const handlePaid = useCallback(
    async (result: PaymentVerify) => {
      clearPayRef();
      if (result.slipViewed || !result.tips?.length) {
        setPaid(null);
        setCheckout(null);
        return;
      }
      setPaid(result);
      setCheckout(null);
      await ackSlip(result.reference ?? "", token);
      await refresh();
    },
    [refresh, token]
  );

  const dismissPaid = useCallback(() => {
    setPaid(null);
    clearPayRef();
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckout(null);
  }, []);

  return {
    busy,
    error,
    phone,
    setPhone,
    country,
    setCountry,
    checkout,
    paid,
    startPay,
    handlePaid,
    dismissPaid,
    closeCheckout,
  };
}
