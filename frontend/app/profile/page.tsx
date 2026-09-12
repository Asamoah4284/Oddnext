"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MoolreCheckout } from "@/components/MoolreCheckout";
import { PaidSlip } from "@/components/PaidSlip";
import { PhoneField } from "@/components/PhoneField";
import { useMoolrePay } from "@/hooks/useMoolrePay";
import { fallbackStats } from "@/lib/api";
import { SLIP_PRODUCTS, VIP_PRODUCT, canAccessBoard } from "@/lib/products";

export default function ProfilePage() {
  const { user } = useAuth();
  const {
    busy,
    error,
    phone,
    setPhone,
    checkout,
    paid,
    startPay,
    handlePaid,
    closeCheckout,
  } = useMoolrePay();

  const allAccess = user?.role === "admin" || Boolean(user?.vipActive);

  return (
    <>
      <Header
        telegramCount={fallbackStats.telegramCount}
        telegramUrl={fallbackStats.telegramUrl}
      />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-fire">Boards</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-cream sm:text-5xl">
            {allAccess ? "VIP · all boards" : "Pay first. Then you see the odds."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-mute sm:text-base">
            {allAccess
              ? "Every odds board is open."
              : "Enter the number you will pay with. After Mobile Money confirms, the slip opens here and is sent by SMS."}
          </p>
        </div>

        {paid?.status === "paid" && (
          <div className="mt-8">
            <PaidSlip
              tips={paid.tips ?? []}
              product={paid.product}
              smsSent={paid.smsSent}
            />
            <Link href="/#tips" className="btn-primary mt-4">
              Open live boards
            </Link>
          </div>
        )}

        {!allAccess && (
          <div className="card mt-8 max-w-md p-5">
            <PhoneField value={phone} onChange={setPhone} />
          </div>
        )}

        {allAccess ? (
          <div className="card mt-8 p-6">
            <Link href="/#tips" className="btn-primary">
              Open today’s boards
            </Link>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
            {SLIP_PRODUCTS.map((item) => {
              const owned = canAccessBoard(user, item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-t border-line px-4 py-4 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="text-base font-bold text-cream">{item.label}</p>
                    <p className="mt-0.5 text-sm font-extrabold text-star">
                      GHS {item.priceGhs}
                    </p>
                  </div>
                  {owned ? (
                    <Link href="/#tips" className="btn-outline shrink-0 px-4 py-2 text-sm">
                      Open
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startPay(item.id)}
                      disabled={Boolean(busy)}
                      className="btn-outline shrink-0 px-4 py-2 text-sm"
                    >
                      {busy === item.id ? "…" : "Pay"}
                    </button>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3 border-t border-fire/30 bg-fire/10 px-4 py-4">
              <div className="min-w-0">
                <p className="text-base font-bold text-cream">{VIP_PRODUCT.label}</p>
                <p className="mt-0.5 text-sm font-extrabold text-star">
                  GHS {VIP_PRODUCT.priceGhs}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void startPay("vip")}
                disabled={Boolean(busy)}
                className="btn-primary shrink-0 px-4 py-2 text-sm"
              >
                {busy === "vip" ? "…" : "Join"}
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-5 rounded-2xl border border-lost/30 bg-lost/10 px-4 py-3 text-sm text-lost">
            {error}
          </p>
        )}
      </main>
      <Footer />
      {checkout && (
        <MoolreCheckout
          session={checkout}
          onClose={closeCheckout}
          onPaid={handlePaid}
        />
      )}
    </>
  );
}
