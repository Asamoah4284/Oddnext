"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PaidSlip } from "@/components/PaidSlip";
import { apiFetch, fallbackStats } from "@/lib/api";
import {
  PAYMENT_EVENT,
  clearPayRef,
  verifyCheckout,
} from "@/lib/payments";

function PaymentReturnInner() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? params.get("externalref") ?? "";
  const simulate = params.get("simulate") === "1";
  const embed = params.get("embed") === "1";
  const { token, ready, refresh } = useAuth();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "error">(
    "checking"
  );
  const [message, setMessage] = useState("Confirming your payment…");
  const [paid, setPaid] = useState<{
    tips: NonNullable<Awaited<ReturnType<typeof verifyCheckout>>["tips"]>;
    product?: string;
    smsSent?: boolean;
  } | null>(null);

  const inFrame = embed || (typeof window !== "undefined" && window.parent !== window);

  useEffect(() => {
    if (!reference || typeof window === "undefined") return;
    if (window.parent === window) return;
    window.parent.postMessage(
      { type: PAYMENT_EVENT, reference },
      window.location.origin
    );
  }, [reference]);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setStatus("error");
      setMessage("Open this page from the same browser you paid in.");
      return;
    }
    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference.");
      return;
    }

    let cancelled = false;

    async function confirm(poll = false) {
      try {
        if (simulate && !poll) {
          await apiFetch("/api/payments/simulate", {
            method: "POST",
            token,
            body: JSON.stringify({ reference }),
          });
        }
        const result = await verifyCheckout(reference, token, poll);
        if (cancelled) return;
        if (result.status === "paid") {
          clearPayRef();
          setStatus("paid");
          setPaid({
            tips: result.tips ?? [],
            product: result.product,
            smsSent: result.smsSent,
          });
          setMessage(
            result.smsSent
              ? "Payment confirmed. Your slip is below and on SMS."
              : "Payment confirmed. Your slip is unlocked below."
          );
          await refresh();
          return true;
        }
        setStatus("pending");
        setMessage("Waiting for Mobile Money to confirm…");
        return false;
      } catch (err) {
        if (cancelled) return false;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not verify payment");
        return false;
      }
    }

    void confirm();
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > 90_000) {
        window.clearInterval(timer);
        return;
      }
      void confirm(true);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, token, reference, simulate, refresh]);

  const body = (
    <div className={inFrame ? "p-6" : "card p-8"}>
      <p className="text-sm font-medium text-fire">Checkout</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        {status === "paid"
          ? `${paid?.product ? "Board unlocked" : "Payment confirmed"}`
          : "Payment status"}
      </h1>
      <p className="mt-3 text-sm text-mute">{message}</p>

      {status === "paid" && paid && (
        <div className="mt-6">
          <PaidSlip
            tips={paid.tips}
            product={paid.product}
            smsSent={paid.smsSent}
          />
        </div>
      )}

      {!inFrame && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#tips" className="btn-primary">
            Open live boards
          </Link>
          <Link href="/profile" className="btn-outline">
            Buy another board
          </Link>
        </div>
      )}
    </div>
  );

  if (inFrame) {
    return <main className="min-h-screen bg-paper">{body}</main>;
  }

  return (
    <>
      <Header
        telegramCount={fallbackStats.telegramCount}
        telegramUrl={fallbackStats.telegramUrl}
      />
      <main className="mx-auto max-w-2xl px-4 py-16">{body}</main>
      <Footer />
    </>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-mute">
          Checking payment…
        </main>
      }
    >
      <PaymentReturnInner />
    </Suspense>
  );
}
