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
import { looksLikeGhPhone, readSavedPhone, savePhone } from "@/lib/phone";
import type { ProductId } from "@/lib/products";
import type { AuthUser } from "@/lib/types";

export function useMoolrePay() {
  const { token, user, applySession, refresh } = useAuth();
  const [busy, setBusy] = useState<ProductId | "">("");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [paid, setPaid] = useState<PaymentVerify | null>(null);

  useEffect(() => {
    const saved = readSavedPhone();
    if (saved) {
      setPhone(saved);
      return;
    }
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);

  useEffect(() => {
    return () => {
      setPaid(null);
      clearPayRef();
    };
  }, []);

  const startPay = useCallback(
    async (product: ProductId) => {
      if (!looksLikeGhPhone(phone)) {
        setError("Enter the Mobile Money number that will pay. The slip SMS goes there.");
        return;
      }
      setBusy(product);
      setError("");
      setPaid(null);
      savePhone(phone);
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
    [token, applySession, phone]
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
    checkout,
    paid,
    startPay,
    handlePaid,
    dismissPaid,
    closeCheckout,
  };
}
