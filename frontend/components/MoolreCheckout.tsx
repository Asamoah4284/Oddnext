"use client";

import { useEffect, useRef, useState } from "react";
import {
  isPaymentMessage,
  verifyCheckout,
  type PaymentVerify,
} from "@/lib/payments";

export type CheckoutSession = {
  authorizationUrl: string;
  reference: string;
  token: string | null;
};

export function MoolreCheckout({
  session,
  onClose,
  onPaid,
}: {
  session: CheckoutSession;
  onClose: () => void;
  onPaid: (result: PaymentVerify) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const done = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    done.current = false;
    setConfirming(false);

    async function check(poll = true) {
      if (done.current || inFlight.current) return;
      inFlight.current = true;
      try {
        const result = await verifyCheckout(
          session.reference,
          session.token,
          poll
        );
        if (result.status === "paid") {
          done.current = true;
          setConfirming(true);
          onPaid(result);
        }
      } catch {
        // Keep polling; a single failed check should not close checkout.
      } finally {
        inFlight.current = false;
      }
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isPaymentMessage(event.data)) return;
      if (event.data.reference !== session.reference) return;
      setConfirming(true);
      void check(false);
    }

    window.addEventListener("message", onMessage);
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > 90_000) {
        window.clearInterval(timer);
        return;
      }
      void check(true);
    }, 3000);
    void check(true);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [session.reference, session.token, onPaid]);

  return (
    <div className="fixed inset-0 z-[80] bg-white">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close checkout"
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-lg text-white"
      >
        ×
      </button>
      <iframe
        title="Moolre checkout"
        src={session.authorizationUrl}
        className="h-full w-full border-0"
        allow="payment *; publickey-credentials-get *"
      />
      {confirming && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b1220]/90">
          <p className="text-sm font-semibold text-cream">Unlocking your slip…</p>
        </div>
      )}
    </div>
  );
}
