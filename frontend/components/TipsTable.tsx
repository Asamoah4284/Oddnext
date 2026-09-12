"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MoolreCheckout } from "@/components/MoolreCheckout";
import { PaidSlip } from "@/components/PaidSlip";
import { PhoneField } from "@/components/PhoneField";
import { fetchTips } from "@/lib/api";
import { useMoolrePay } from "@/hooks/useMoolrePay";
import type { PaymentVerify } from "@/lib/payments";
import { formatKickoff } from "@/lib/format";
import { SLIP_PRODUCTS, VIP_PRODUCT, canAccessBoard } from "@/lib/products";
import type { SlipProductId } from "@/lib/products";
import type { Tip, TipsResponse } from "@/lib/types";

const days = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
] as const;

function ResultChip({ status }: { status: Tip["status"] }) {
  if (status === "won") {
    return (
      <span className="rounded-full bg-won/15 px-2.5 py-1 text-xs font-semibold text-won">
        Won
      </span>
    );
  }
  if (status === "lost") {
    return (
      <span className="rounded-full bg-lost/15 px-2.5 py-1 text-xs font-semibold text-lost">
        Lost
      </span>
    );
  }
  return null;
}

export function TipsTable({ initial }: { initial: TipsResponse }) {
  const { token, user, ready } = useAuth();
  const {
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
  } = useMoolrePay();
  const [tab, setTab] = useState<TipsResponse["tab"]>(initial.tab);
  const [board, setBoard] = useState<SlipProductId>(initial.board || "odds10");
  const onPaid = useCallback(
    (result: PaymentVerify) => {
      if (result.product && result.product !== "vip") {
        setBoard(result.product as SlipProductId);
      }
      void handlePaid(result);
    },
    [handlePaid]
  );
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    fetchTips(tab, token, board)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            tab,
            board,
            vipAccess: false,
            boardAccess: false,
            entitlements: [],
            tips: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, board, token, ready, user?.vipActive, user?.entitlements]);

  const clusters = useMemo(() => {
    const groups: { code: string; tips: Tip[] }[] = [];
    const index = new Map<string, number>();
    for (const tip of data.tips) {
      const code = tip.bookingCode || "";
      if (!code) {
        groups.push({ code: "", tips: [tip] });
        continue;
      }
      const existing = index.get(code);
      if (existing === undefined) {
        index.set(code, groups.length);
        groups.push({ code, tips: [tip] });
      } else {
        groups[existing].tips.push(tip);
      }
    }
    return groups;
  }, [data.tips]);

  const selected = SLIP_PRODUCTS.find((item) => item.id === board) ?? SLIP_PRODUCTS[0];
  const unlocked = data.boardAccess || canAccessBoard(user, board);

  return (
    <section id="tips" className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6">
        <p className="text-sm font-medium text-fire">Live boards</p>
        <h2 className="font-sans text-3xl font-extrabold tracking-tight md:text-4xl">
          Today’s games
        </h2>
        <p className="mt-2 text-sm text-mute">
          Pick a board. Pay that price, or join VIP for GHS {VIP_PRODUCT.priceGhs} and open all.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {SLIP_PRODUCTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBoard(item.id)}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              board === item.id
                ? "bg-fire text-pitch-dark"
                : "bg-surface text-mute ring-1 ring-line"
            }`}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-80">GHS {item.priceGhs}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex w-full rounded-full bg-surface p-1 ring-1 ring-line md:w-fit">
        {days.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold md:flex-none md:px-4 ${
              tab === item.id ? "bg-fire text-pitch-dark" : "text-mute"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {paid?.status === "paid" && (paid.tips?.length ?? 0) > 0 && (
        <div className="mb-6">
          <PaidSlip
            tips={paid.tips ?? []}
            product={paid.product}
            smsSent={paid.smsSent}
          />
          <button
            type="button"
            onClick={dismissPaid}
            className="btn-outline mt-3"
          >
            Done · slip stays on SMS only
          </button>
        </div>
      )}

      {!unlocked ? (
        <div className="card p-6 text-center sm:p-10">
          <p className="text-xs font-medium text-fire">{selected.label}</p>
          <h3 className="mt-2 font-sans text-2xl font-extrabold tracking-tight">
            Pay GHS {selected.priceGhs} for this board.
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mute">
            Picks, odds, and booking codes stay hidden until you pay this board — or
            unlock every board with VIP for GHS {VIP_PRODUCT.priceGhs}.
          </p>
          <div className="mx-auto mt-5 max-w-sm text-left">
            <PhoneField value={phone} onChange={setPhone} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void startPay(selected.id)}
              disabled={Boolean(busy)}
              className="btn-primary"
            >
              {busy === selected.id
                ? "Opening checkout…"
                : `Unlock ${selected.label} · GHS ${selected.priceGhs}`}
            </button>
            <button
              type="button"
              onClick={() => void startPay("vip")}
              disabled={Boolean(busy)}
              className="btn-outline"
            >
              {busy === "vip"
                ? "Opening checkout…"
                : `VIP all boards · GHS ${VIP_PRODUCT.priceGhs}`}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-lost">{error}</p>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="hidden grid-cols-[1fr_1.4fr_0.9fr_0.5fr_0.6fr_0.7fr] px-4 py-3 text-xs text-mute md:grid">
            <span>League</span>
            <span>Fixture</span>
            <span>Pick</span>
            <span>Odds</span>
            <span>KO</span>
            <span>Result</span>
          </div>
          {loading && <p className="px-4 py-6 text-sm text-mute">Updating…</p>}
          {!loading && data.tips.length === 0 && (
            <p className="px-4 py-8 text-sm text-mute">
              Nothing on this board yet. Check back after midday.
            </p>
          )}
          {clusters.map((cluster, i) => (
            <div key={`${cluster.code}-${i}`} className="border-t border-line">
              {cluster.tips.map((tip) => (
                <div
                  key={tip.id}
                  className="grid gap-2 px-4 py-4 md:grid-cols-[1fr_1.4fr_0.9fr_0.5fr_0.6fr_0.7fr] md:items-center"
                >
                  <div className="flex items-center justify-between gap-2 md:block">
                    <p className="text-xs text-mute">{tip.league}</p>
                    <span className="md:hidden">
                      <ResultChip status={tip.status} />
                    </span>
                  </div>
                  <p className="text-sm font-semibold">
                    {tip.homeTeam} <span className="font-normal text-mute">vs</span>{" "}
                    {tip.awayTeam}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-sm md:contents">
                    <p className="text-star">{tip.prediction}</p>
                    <p className="font-mono">{tip.odds ? tip.odds.toFixed(2) : "—"}</p>
                    <p className="text-mute md:text-ink">{formatKickoff(tip.kickoffAt)}</p>
                  </div>
                  <div className="hidden md:block">
                    <ResultChip status={tip.status} />
                  </div>
                </div>
              ))}
              {cluster.code && (
                <div className="flex items-center justify-between bg-paper/80 px-4 py-2.5">
                  <span className="text-xs text-mute">Booking code</span>
                  <span className="rounded-lg bg-fire/10 px-2 py-1 font-mono text-sm font-semibold text-star">
                    {cluster.code}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {checkout && (
        <MoolreCheckout
          session={checkout}
          onClose={closeCheckout}
          onPaid={onPaid}
        />
      )}
    </section>
  );
}
