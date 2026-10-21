"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { productLabel } from "@/lib/products";
import type {
  PaymentAnalyticsData,
  AdminPaymentItem,
  RevenueBucket,
} from "@/lib/types";

interface AdminPaymentsAnalyticsProps {
  token: string | null;
}

export function AdminPaymentsAnalytics({ token }: AdminPaymentsAnalyticsProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "allTime">("day");
  const [analytics, setAnalytics] = useState<PaymentAnalyticsData | null>(null);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Payment filters & pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function loadAnalytics() {
    if (!token) return;
    try {
      setLoadingAnalytics(true);
      setError("");
      const res = await apiFetch<{ analytics: PaymentAnalyticsData }>(
        "/api/admin/payments/analytics",
        { token }
      );
      setAnalytics(res.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function loadPayments(targetPage = page) {
    if (!token) return;
    try {
      setLoadingPayments(true);
      setError("");
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", "15");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (productFilter !== "all") params.set("product", productFilter);
      if (currencyFilter !== "all") params.set("currency", currencyFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await apiFetch<{
        payments: AdminPaymentItem[];
        pagination: { page: number; pages: number; total: number };
      }>(`/api/admin/payments?${params.toString()}`, { token });

      setPayments(res.payments);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.pages);
      setTotalPaymentsCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoadingPayments(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void loadPayments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter, productFilter, currencyFilter, searchQuery]);

  async function handleMarkPaid(id: string) {
    if (!token) return;
    if (!window.confirm("Confirm marking this payment as PAID and granting user access?")) {
      return;
    }
    try {
      setMarkingId(id);
      setActionMessage("");
      await apiFetch(`/api/admin/payments/${id}/mark-paid`, {
        method: "PATCH",
        token,
      });
      setActionMessage("✓ Payment marked as paid successfully.");
      await Promise.all([loadAnalytics(), loadPayments(page)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setMarkingId(null);
    }
  }

  async function handleClearPayments() {
    if (!token) return;
    if (
      !window.confirm(
        "Are you sure you want to clear all mock/test payments? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      setActionMessage("");
      setError("");
      const res = await apiFetch<{ message: string }>("/api/admin/payments", {
        method: "DELETE",
        token,
      });
      setActionMessage(res.message || "All payments have been cleared.");
      await Promise.all([loadAnalytics(), loadPayments(1)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear payments");
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchDraft);
  }

  const activeBucket: RevenueBucket = useMemo(() => {
    if (!analytics) {
      return {
        grossGhs: 0,
        grossNgn: 0,
        combinedGhs: 0,
        hisGhs: 0,
        myGhs: 0,
        hisNgn: 0,
        myNgn: 0,
        combinedHisGhs: 0,
        combinedMyGhs: 0,
        count: 0,
      };
    }
    return analytics[period] || analytics.day;
  }, [analytics, period]);

  const periodLabel = {
    day: "Today (24h)",
    week: "This Week",
    month: "This Month",
    allTime: "All Time",
  }[period];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fire/20 text-fire sm:h-8 sm:w-8">
              💰
            </span>
            <h2 className="text-base font-extrabold text-cream sm:text-xl">
              Payment & Revenue Analytics
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] text-mute sm:text-xs">
            Live sales tracking with automatic <strong>60% / 40%</strong> partner profit split.
          </p>
        </div>

        {/* Split Badges & Refresh */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/30 sm:px-3 sm:py-1.5 sm:text-xs">
            <span>👑</span>
            <span>Forson: <strong>60%</strong></span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 sm:px-3 sm:py-1.5 sm:text-xs">
            <span>💼</span>
            <span>Asamoah: <strong>40%</strong></span>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadAnalytics();
              void loadPayments(page);
            }}
            disabled={loadingAnalytics || loadingPayments}
            className="rounded-lg bg-surface px-2 py-1 text-[11px] font-semibold text-mute hover:text-white transition border border-line sm:px-2.5 sm:py-1.5 sm:text-xs"
            title="Refresh"
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            onClick={handleClearPayments}
            disabled={loadingAnalytics || loadingPayments}
            className="rounded-lg bg-lost/10 px-2 py-1 text-[11px] font-semibold text-lost hover:bg-lost/20 transition border border-lost/30 sm:px-2.5 sm:py-1.5 sm:text-xs"
            title="Clear all test payment transactions"
          >
            🗑️ Clear Test Data
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-lost/30 bg-lost/10 px-3.5 py-2.5 text-xs text-lost sm:text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-xs hover:underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl border border-fire/30 bg-fire/15 px-3.5 py-2.5 text-xs text-fire sm:text-sm flex items-center justify-between">
          <span>{actionMessage}</span>
          <button type="button" onClick={() => setActionMessage("")} className="text-xs hover:underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Period Selection Navigation Tabs */}
      <div className="space-y-2 border-b border-line pb-3">
        <div className="grid grid-cols-4 gap-1 p-1 bg-surface rounded-xl ring-1 ring-line sm:flex sm:w-auto">
          {(["day", "week", "month", "allTime"] as const).map((p) => {
            const shortLabels = {
              day: "Today",
              week: "Week",
              month: "Month",
              allTime: "All Time",
            };
            const fullLabels = {
              day: "📅 Today",
              week: "🗓️ This Week",
              month: "📊 This Month",
              allTime: "🌐 All Time",
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg py-1.5 px-1 sm:px-3.5 text-center text-[11px] sm:text-xs font-bold transition ${
                  period === p
                    ? "bg-fire text-pitch-dark shadow"
                    : "text-mute hover:text-white"
                }`}
              >
                <span className="sm:hidden">{shortLabels[p]}</span>
                <span className="hidden sm:inline">{fullLabels[p]}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-mute sm:text-xs">
          Showing profit split for: <strong className="text-white">{periodLabel}</strong>
        </p>
      </div>

      {/* 3 Main Highlight KPI Cards (Gross, Forson 60%, Asamoah 40%) */}
      <div className="grid grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-3">
        {/* Card 1: Total Gross Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-slip">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-mute">
              Gross Revenue · {periodLabel}
            </span>
            <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-mute border border-line">
              100% Total
            </span>
          </div>
          <div className="mt-2.5 sm:mt-3 space-y-0.5 sm:space-y-1">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="text-2xl font-black text-white sm:text-3xl">
                ₵{activeBucket.grossGhs.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-mute">GHS</span>
            </div>
            <div className="flex items-baseline gap-1.5 text-xs sm:text-sm text-mute">
              <span>₦{activeBucket.grossNgn.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-mute/80">NGN</span>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center justify-between border-t border-line/60 pt-2.5 sm:pt-3 text-[11px] sm:text-xs text-mute">
            <span>Successful Orders:</span>
            <strong className="text-white font-mono">{activeBucket.count} paid</strong>
          </div>
        </div>

        {/* Card 2 & 3 Mobile Container: 2 columns side by side on mobile */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:contents">
          {/* Card 2: Forson Share (60%) */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 sm:p-5 shadow-slip">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-xs sm:text-sm">👑</span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                  Forson (60%)
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-xl font-black text-amber-300 sm:text-3xl">
                  ₵{activeBucket.hisGhs.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-400/80">GHS</span>
              </div>
              <div className="flex items-baseline gap-1 text-[11px] sm:text-sm text-amber-200/70">
                <span>₦{activeBucket.hisNgn.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold">NGN</span>
              </div>
            </div>
            <div className="mt-2.5 sm:mt-4 flex items-center justify-between border-t border-amber-500/20 pt-2 sm:pt-3 text-[10px] sm:text-xs text-amber-300/80">
              <span className="hidden sm:inline">Forson Payout:</span>
              <strong className="text-amber-300 font-mono">60% of Gross</strong>
            </div>
          </div>

          {/* Card 3: Asamoah Share (40%) */}
          <div className="relative overflow-hidden rounded-2xl border border-fire/30 bg-fire/5 p-3.5 sm:p-5 shadow-slip">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-xs sm:text-sm">💼</span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-fire">
                  Asamoah (40%)
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-xl font-black text-fire sm:text-3xl">
                  ₵{activeBucket.myGhs.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-fire/80">GHS</span>
              </div>
              <div className="flex items-baseline gap-1 text-[11px] sm:text-sm text-emerald-200/70">
                <span>₦{activeBucket.myNgn.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold">NGN</span>
              </div>
            </div>
            <div className="mt-2.5 sm:mt-4 flex items-center justify-between border-t border-fire/20 pt-2 sm:pt-3 text-[10px] sm:text-xs text-emerald-300/80">
              <span className="hidden sm:inline">Asamoah Payout:</span>
              <strong className="text-fire font-mono">40% of Gross</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Split Gauge & Payment Health */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Visual Split Bar */}
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-2.5 border-b border-line">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-mute">
              Profit Split Allocation ({periodLabel})
            </p>
            <span className="text-[11px] sm:text-xs text-mute">
              Combined: <strong className="text-white">~₵{activeBucket.combinedGhs.toFixed(2)}</strong>
            </span>
          </div>

          <div className="mt-3 sm:mt-4 space-y-2">
            {/* Split Bar */}
            <div className="relative flex h-7 sm:h-8 w-full overflow-hidden rounded-xl bg-paper p-0.5 ring-1 ring-line">
              <div
                style={{ width: "60%" }}
                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-[10px] sm:text-xs font-extrabold text-pitch-dark shadow-sm transition-all"
              >
                👑 60% Forson
              </div>
              <div
                style={{ width: "40%" }}
                className="flex items-center justify-center rounded-lg bg-gradient-to-r from-fire-dark to-fire text-[10px] sm:text-xs font-extrabold text-pitch-dark shadow-sm transition-all"
              >
                💼 40% Asamoah
              </div>
            </div>

            {/* Split Details Below Bar */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1 text-xs">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 sm:p-3">
                <p className="font-bold text-amber-400 text-[11px] sm:text-xs">👑 Forson Payout (60%)</p>
                <p className="mt-0.5 font-mono text-xs sm:text-sm font-extrabold text-white">
                  ₵{activeBucket.hisGhs.toFixed(2)}
                </p>
                <p className="text-[10px] text-mute font-mono">
                  + ₦{activeBucket.hisNgn.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl border border-fire/20 bg-fire/5 p-2.5 sm:p-3">
                <p className="font-bold text-fire text-[11px] sm:text-xs">💼 Asamoah Payout (40%)</p>
                <p className="mt-0.5 font-mono text-xs sm:text-sm font-extrabold text-white">
                  ₵{activeBucket.myGhs.toFixed(2)}
                </p>
                <p className="text-[10px] text-mute font-mono">
                  + ₦{activeBucket.myNgn.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Health Summary */}
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-mute pb-2.5 border-b border-line">
            Payment Health & Conversion
          </p>
          <div className="mt-3 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-mute flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-won" /> Paid (Completed)
              </span>
              <strong className="font-mono text-won text-sm">
                {analytics?.statusCounts.paid ?? 0}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-mute flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending (Checkout)
              </span>
              <strong className="font-mono text-amber-400 text-sm">
                {analytics?.statusCounts.pending ?? 0}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-mute flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lost" /> Failed
              </span>
              <strong className="font-mono text-lost text-sm">
                {analytics?.statusCounts.failed ?? 0}
              </strong>
            </div>
            <div className="border-t border-line/60 pt-2.5 flex items-center justify-between text-xs">
              <span className="font-medium text-mute">Checkout Success:</span>
              <span className="rounded-full bg-fire/15 px-2 py-0.5 font-bold text-fire text-[11px]">
                {analytics?.statusCounts.successRate ?? 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Period Comprehensive Comparison (Cards on mobile, Table on desktop) */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-slip">
        <div className="border-b border-line bg-paper/80 px-3.5 py-2.5 sm:px-5 sm:py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cream">
            Multi-Period Revenue & Split Comparison
          </h3>
          <p className="text-[10px] sm:text-[11px] text-mute">
            Side-by-side comparison of Today, This Week, This Month, and All-Time totals.
          </p>
        </div>

        {/* Mobile View: Clean Period Summary Cards */}
        <div className="grid grid-cols-1 gap-2 p-3 md:hidden">
          {[
            { key: "day", label: "Today (24h)", data: analytics?.day },
            { key: "week", label: "This Week", data: analytics?.week },
            { key: "month", label: "This Month", data: analytics?.month },
            { key: "allTime", label: "All Time", data: analytics?.allTime },
          ].map(({ key, label, data }) => (
            <div
              key={key}
              onClick={() => setPeriod(key as "day" | "week" | "month" | "allTime")}
              className={`cursor-pointer rounded-xl border p-3 space-y-2 transition ${
                period === key
                  ? "border-fire/50 bg-fire/5 shadow-sm"
                  : "border-line bg-paper/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  {period === key && <span className="h-2 w-2 rounded-full bg-fire" />}
                  <span>{label}</span>
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-mono text-mute border border-line">
                  {data?.count ?? 0} paid
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-line/50 pt-2 text-xs">
                <span className="text-[10px] text-mute uppercase font-bold">Gross Total:</span>
                <span className="font-mono font-bold text-white">
                  ₵{(data?.grossGhs ?? 0).toFixed(2)}{" "}
                  <span className="text-[10px] text-mute font-normal">
                    (₦{(data?.grossNgn ?? 0).toLocaleString()})
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                  <p className="text-[10px] font-bold text-amber-400">👑 Forson (60%)</p>
                  <p className="font-mono font-bold text-amber-300 mt-0.5">
                    ₵{(data?.hisGhs ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-amber-200/60 font-mono">
                    ₦{(data?.hisNgn ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-fire/10 border border-fire/20 p-2">
                  <p className="text-[10px] font-bold text-fire">💼 Asamoah (40%)</p>
                  <p className="font-mono font-bold text-fire mt-0.5">
                    ₵{(data?.myGhs ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-emerald-200/60 font-mono">
                    ₦{(data?.myNgn ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Wide Comparison Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-pitch/80 text-[11px] font-bold uppercase tracking-wider text-mute">
              <tr>
                <th className="py-3 pl-4 pr-3">Time Period</th>
                <th className="py-3 px-3">Gross (GHS)</th>
                <th className="py-3 px-3">Gross (NGN)</th>
                <th className="py-3 px-3 text-amber-400">👑 Forson (60%)</th>
                <th className="py-3 px-3 text-fire">💼 Asamoah (40%)</th>
                <th className="py-3 pr-4 pl-3 text-center">Paid Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {[
                { key: "day", label: "Today (24h)", data: analytics?.day },
                { key: "week", label: "This Week", data: analytics?.week },
                { key: "month", label: "This Month", data: analytics?.month },
                { key: "allTime", label: "All Time", data: analytics?.allTime },
              ].map(({ key, label, data }) => (
                <tr
                  key={key}
                  className={`transition hover:bg-paper/40 ${
                    period === key ? "bg-fire/5 font-semibold" : ""
                  }`}
                >
                  <td className="py-3 pl-4 pr-3 font-medium text-cream flex items-center gap-2">
                    {period === key && <span className="h-2 w-2 rounded-full bg-fire" />}
                    <span>{label}</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    ₵{(data?.grossGhs ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 font-mono text-mute">
                    ₦{(data?.grossNgn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                    ₵{(data?.hisGhs ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                    <span className="text-[11px] text-amber-200/60 font-normal">
                      (₦{(data?.hisNgn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })})
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-fire font-bold">
                    ₵{(data?.myGhs ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                    <span className="text-[11px] text-emerald-200/60 font-normal">
                      (₦{(data?.myNgn ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })})
                    </span>
                  </td>
                  <td className="py-3 pr-4 pl-3 font-mono text-center text-white">
                    {data?.count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product / Board Breakdown */}
      {analytics?.byProduct && analytics.byProduct.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-slip">
          <div className="border-b border-line bg-paper/80 px-3.5 py-2.5 sm:px-5 sm:py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cream">
              Revenue Breakdown by Product / Odds Board
            </h3>
            <p className="text-[10px] sm:text-[11px] text-mute">
              Earnings and split distribution per VIP pass and individual odds board slips.
            </p>
          </div>

          {/* Mobile View: Product Cards */}
          <div className="grid grid-cols-1 gap-2 p-3 md:hidden">
            {analytics.byProduct.map((prod) => (
              <div key={prod.id} className="rounded-xl border border-line bg-paper/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{prod.label}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-mono text-mute border border-line">
                    {prod.count} orders
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-line/50 pt-2 text-xs">
                  <span className="text-[10px] text-mute uppercase font-bold">Gross:</span>
                  <span className="font-mono font-bold text-white">
                    ₵{prod.grossGhs.toFixed(2)}{" "}
                    <span className="text-[10px] text-mute font-normal">
                      (₦{prod.grossNgn.toLocaleString()})
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
                    <p className="text-[10px] font-bold text-amber-400">👑 Forson (60%)</p>
                    <p className="font-mono font-bold text-amber-300 mt-0.5">
                      ₵{prod.hisGhs.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-fire/10 border border-fire/20 p-2">
                    <p className="text-[10px] font-bold text-fire">💼 Asamoah (40%)</p>
                    <p className="font-mono font-bold text-fire mt-0.5">
                      ₵{prod.myGhs.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Product Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-pitch/80 text-[11px] font-bold uppercase tracking-wider text-mute">
                <tr>
                  <th className="py-3 pl-4 pr-3">Product / Board</th>
                  <th className="py-3 px-3 text-center">Orders</th>
                  <th className="py-3 px-3">Total Gross (GHS)</th>
                  <th className="py-3 px-3">Total Gross (NGN)</th>
                  <th className="py-3 px-3 text-amber-400">👑 Forson (60%)</th>
                  <th className="py-3 pr-4 pl-3 text-fire">💼 Asamoah (40%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {analytics.byProduct.map((prod) => (
                  <tr key={prod.id} className="hover:bg-paper/40 transition">
                    <td className="py-3 pl-4 pr-3 font-medium text-cream">
                      {prod.label}
                    </td>
                    <td className="py-3 px-3 font-mono text-center text-white">
                      {prod.count}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      ₵{prod.grossGhs.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 font-mono text-mute">
                      ₦{prod.grossNgn.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">
                      ₵{prod.hisGhs.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 pr-4 pl-3 font-mono font-bold text-fire">
                      ₵{prod.myGhs.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Payments Ledger Table (Mobile Cards & Desktop Table) */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-slip">
        <div className="border-b border-line bg-paper/80 px-3.5 py-3 sm:px-5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cream">
                All Transactions ({totalPaymentsCount})
              </h3>
              <p className="text-[10px] sm:text-[11px] text-mute">
                Audit ledger with customer info, gateway references, and split amounts.
              </p>
            </div>
            {/* Search form */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Search phone, name, ref..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="field py-1 px-2.5 text-xs w-full sm:w-60"
              />
              <button type="submit" className="btn-outline px-2.5 py-1 text-xs shrink-0">
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    setSearchQuery("");
                  }}
                  className="text-xs text-lost hover:underline shrink-0"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Filter Pills */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
            <span className="text-[10px] sm:text-[11px] font-semibold text-mute">Status:</span>
            {(["all", "paid", "pending", "failed"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold capitalize transition ${
                  statusFilter === st
                    ? "bg-fire text-pitch-dark"
                    : "bg-surface text-mute hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}

            <span className="ml-2 text-[10px] sm:text-[11px] font-semibold text-mute">Curr:</span>
            {(["all", "GHS", "NGN"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrencyFilter(curr)}
                className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold transition ${
                  currencyFilter === curr
                    ? "bg-fire text-pitch-dark"
                    : "bg-surface text-mute hover:text-white"
                }`}
              >
                {curr === "all" ? "All" : curr === "GHS" ? "🇬🇭 GHS" : "🇳🇬 NGN"}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile View: Transaction Cards */}
        <div className="grid grid-cols-1 gap-2 p-3 md:hidden">
          {loadingPayments ? (
            <p className="py-8 text-center text-xs text-mute">Loading transactions…</p>
          ) : payments.length === 0 ? (
            <p className="py-8 text-center text-xs text-mute">No transactions found.</p>
          ) : (
            payments.map((p) => {
              const isPaid = p.status === "paid";
              const isPending = p.status === "pending";
              const currencySymbol = p.currency === "NGN" ? "₦" : "₵";

              return (
                <div key={p.id} className="rounded-xl border border-line bg-paper/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">
                        {p.customer.name || "Buyer"}
                      </p>
                      <p className="text-[11px] text-mute font-mono">
                        {p.customer.phone || p.phone || "No phone"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? "bg-won/15 text-won border border-won/30"
                          : isPending
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-lost/15 text-lost border border-lost/30"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/50 pt-2 text-xs">
                    <span className="rounded-lg bg-surface px-2 py-0.5 text-[10px] font-bold text-cream border border-line">
                      {productLabel(p.product)}
                    </span>
                    <span className="font-mono font-bold text-white">
                      {currencySymbol}{p.amount.toLocaleString("en-US", { minimumFractionDigits: p.currency === "NGN" ? 0 : 2 })}
                    </span>
                  </div>

                  {/* 60/40 Split Boxes for this payment */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1.5">
                      <p className="text-[10px] font-bold text-amber-400">👑 Forson (60%)</p>
                      <p className="font-mono font-bold text-amber-300 mt-0.5">
                        {currencySymbol}{p.hisShare.toLocaleString("en-US", { minimumFractionDigits: p.currency === "NGN" ? 0 : 2 })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-fire/10 border border-fire/20 px-2 py-1.5">
                      <p className="text-[10px] font-bold text-fire">💼 Asamoah (40%)</p>
                      <p className="font-mono font-bold text-fire mt-0.5">
                        {currencySymbol}{p.myShare.toLocaleString("en-US", { minimumFractionDigits: p.currency === "NGN" ? 0 : 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/50 pt-2 text-[10px] text-mute">
                    <span>
                      {formatDateTime(p.createdAt)} · <strong className="uppercase">{p.provider}</strong>
                    </span>
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={markingId === p.id}
                        className="rounded-lg bg-fire/20 border border-fire/40 px-2 py-1 font-bold text-fire hover:bg-fire hover:text-pitch-dark transition"
                      >
                        {markingId === p.id ? "…" : "Mark Paid"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-pitch/80 text-[11px] font-bold uppercase tracking-wider text-mute">
              <tr>
                <th className="py-3 pl-4 pr-2">Date / Time</th>
                <th className="py-3 px-2">Customer</th>
                <th className="py-3 px-2">Product</th>
                <th className="py-3 px-2">Gross Amount</th>
                <th className="py-3 px-2 text-amber-400">👑 Forson (60%)</th>
                <th className="py-3 px-2 text-fire">💼 Asamoah (40%)</th>
                <th className="py-3 px-2">Gateway</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 pr-4 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loadingPayments ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-mute">
                    Loading payments ledger…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-mute">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isPaid = p.status === "paid";
                  const isPending = p.status === "pending";
                  const currencySymbol = p.currency === "NGN" ? "₦" : "₵";

                  return (
                    <tr key={p.id} className="hover:bg-paper/40 transition">
                      <td className="py-3 pl-4 pr-2 font-mono text-[11px] text-mute whitespace-nowrap">
                        {formatDateTime(p.createdAt)}
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-semibold text-white">
                          {p.customer.name || "Buyer"}
                        </p>
                        <p className="text-[11px] text-mute font-mono">
                          {p.customer.phone || p.phone || "No phone"}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <span className="rounded-lg bg-paper px-2 py-1 text-[11px] font-bold text-cream border border-line">
                          {productLabel(p.product)}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono font-bold text-white whitespace-nowrap">
                        {currencySymbol}
                        {p.amount.toLocaleString("en-US", {
                          minimumFractionDigits: p.currency === "NGN" ? 0 : 2,
                        })}
                      </td>
                      <td className="py-3 px-2 font-mono text-amber-300 font-bold whitespace-nowrap">
                        {currencySymbol}
                        {p.hisShare.toLocaleString("en-US", {
                          minimumFractionDigits: p.currency === "NGN" ? 0 : 2,
                        })}
                      </td>
                      <td className="py-3 px-2 font-mono text-fire font-bold whitespace-nowrap">
                        {currencySymbol}
                        {p.myShare.toLocaleString("en-US", {
                          minimumFractionDigits: p.currency === "NGN" ? 0 : 2,
                        })}
                      </td>
                      <td className="py-3 px-2 uppercase text-[10px] font-mono font-bold text-mute">
                        {p.provider}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? "bg-won/15 text-won border border-won/30"
                              : isPending
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-lost/15 text-lost border border-lost/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 pl-2 text-right whitespace-nowrap">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(p.id)}
                            disabled={markingId === p.id}
                            className="rounded-lg bg-fire/20 border border-fire/40 px-2.5 py-1 text-[10px] font-bold text-fire hover:bg-fire hover:text-pitch-dark transition"
                            title="Manually verify and mark as paid"
                          >
                            {markingId === p.id ? "Saving…" : "Mark Paid"}
                          </button>
                        )}
                        {isPaid && (
                          <span className="text-[11px] text-mute font-mono">
                            Ref: {p.externalRef.slice(0, 10)}…
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPaymentsCount > 0 && (
          <div className="flex items-center justify-between border-t border-line px-3.5 py-2.5 sm:px-5 sm:py-3">
            <p className="text-[11px] sm:text-xs text-mute">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalPaymentsCount} total)
            </p>
            <div className="flex gap-1.5 sm:gap-2">
              <button
                type="button"
                className="btn-outline px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs"
                disabled={page <= 1 || loadingPayments}
                onClick={() => void loadPayments(page - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="btn-outline px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs"
                disabled={page >= totalPages || loadingPayments}
                onClick={() => void loadPayments(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
