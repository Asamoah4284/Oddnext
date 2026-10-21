"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_SLIP_PRODUCTS,
  DEFAULT_VIP_PRODUCT,
  GHS_TO_NGN,
  type ProductItem,
} from "@/lib/products";
import { useProducts } from "./ProductsProvider";

interface AdminPricesEditorProps {
  token: string;
}

const productMeta: Record<
  string,
  { tag: string; description: string; badgeColor: string }
> = {
  odds10: {
    tag: "Banker Slip",
    description: "Daily high-confidence 10 odds accumulator",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  odds50: {
    tag: "Mid Acca",
    description: "High-value 50 odds accumulator",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  odds100: {
    tag: "Mega Slip",
    description: "Massive 100+ odds monster accumulator",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  draw: {
    tag: "Draws",
    description: "Full-time draw games and stalemate predictions",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  correctScore: {
    tag: "Exact Score",
    description: "Precision correct score predictions",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  vip: {
    tag: "All Access",
    description: "Unlocks every daily board + SportyBet booking codes",
    badgeColor: "bg-fire/20 text-fire border-fire/40",
  },
};

const defaultList: ProductItem[] = [
  ...DEFAULT_SLIP_PRODUCTS.map((p) => ({
    id: p.id,
    label: p.label,
    priceGhs: p.priceGhs,
    priceNgn: p.priceNgn,
  })),
  {
    id: DEFAULT_VIP_PRODUCT.id,
    label: DEFAULT_VIP_PRODUCT.label,
    priceGhs: DEFAULT_VIP_PRODUCT.priceGhs,
    priceNgn: DEFAULT_VIP_PRODUCT.priceNgn,
  },
];

export function AdminPricesEditor({ token }: AdminPricesEditorProps) {
  const { setProductList, refreshProducts } = useProducts();
  const [items, setItems] = useState<ProductItem[]>(defaultList);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await apiFetch<{ products: ProductItem[] }>(
          "/api/admin/prices",
          { token, cache: "no-store" }
        );
        if (active && Array.isArray(data.products) && data.products.length > 0) {
          setItems(data.products);
          setProductList(data.products);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load prices"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token, setProductList]);

  const [exchangeRate, setExchangeRate] = useState<number>(GHS_TO_NGN);

  function updatePrice(
    id: string,
    field: "priceGhs" | "priceNgn",
    value: number
  ) {
    setSavedSuccess(false);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function updateLabel(id: string, label: string) {
    setSavedSuccess(false);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label } : item))
    );
  }

  function autoCalculateNgn(id: string, rate = exchangeRate) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            priceNgn: Math.round(item.priceGhs * rate),
          };
        }
        return item;
      })
    );
  }

  function applyRateToAll(rate = exchangeRate) {
    setSavedSuccess(false);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        priceNgn: Math.round(item.priceGhs * rate),
      }))
    );
  }

  function resetToDefaults() {
    if (!window.confirm("Reset all board prices to system defaults?")) return;
    setSavedSuccess(false);
    setItems(defaultList);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    setSavedSuccess(false);
    try {
      // Validate all positive
      for (const item of items) {
        if (item.priceGhs <= 0 || item.priceNgn <= 0) {
          throw new Error(
            `Price for ${item.label} must be greater than zero.`
          );
        }
      }

      const res = await apiFetch<{ products: ProductItem[] }>(
        "/api/admin/prices",
        {
          method: "PUT",
          token,
          body: JSON.stringify({
            prices: items.map((i) => ({
              id: i.id,
              priceGhs: Number(i.priceGhs),
              priceNgn: Number(i.priceNgn),
              label: i.label,
            })),
          }),
        }
      );

      if (res.products) {
        setItems(res.products);
        setProductList(res.products);
      }
      await refreshProducts();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prices");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & overview banner */}
      <div className="card border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Database Synced · Live Pricing Engine
              </p>
            </div>
            <h2 className="mt-1 font-sans text-xl font-extrabold sm:text-2xl text-cream">
              Odds Board & VIP Prices (Ghana & Nigeria)
            </h2>
            <p className="mt-1 text-sm text-mute">
              Set the exact checkout prices saved directly to MongoDB.
              Changes apply instantly across live betting boards and payment checkouts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-xl border border-line bg-paper px-3 py-1.5 text-xs shadow-sm focus-within:border-emerald-500">
              <span className="text-mute mr-1.5 font-medium">1 GHS =</span>
              <input
                type="number"
                step="0.1"
                min="1"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Math.max(1, Number(e.target.value)))}
                className="w-16 bg-transparent font-mono font-bold text-emerald-400 outline-none"
                title="Current exchange rate in NGN (e.g. 114)"
              />
              <span className="text-mute ml-1 font-medium">NGN</span>
            </div>
            <button
              type="button"
              onClick={() => applyRateToAll(exchangeRate)}
              className="btn-outline px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:text-white"
              title={`Recalculate all Nigeria prices using 1 GHS = ${exchangeRate} NGN`}
            >
              Sync All to ₦{exchangeRate}
            </button>
            <button
              type="button"
              onClick={resetToDefaults}
              className="btn-outline px-3.5 py-2 text-xs text-mute hover:text-white"
            >
              Reset Defaults
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-lost/40 bg-lost/10 p-4 text-sm text-lost">
          <p className="font-semibold">Error saving prices:</p>
          <p>{error}</p>
        </div>
      )}

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <p className="font-semibold">✓ Prices updated successfully!</p>
          <p className="text-xs opacity-90">
            Live prices for Ghana and Nigeria have been updated across the
            entire platform and payment gateway.
          </p>
        </div>
      )}

      {/* Pricing list / cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="card p-10 text-center text-sm text-mute">
            Loading current prices…
          </div>
        ) : (
          items.map((item) => {
            const meta = productMeta[item.id] ?? {
              tag: "Board",
              description: item.label,
              badgeColor: "bg-surface text-mute border-line",
            };
            const isVip = item.id === "vip";

            return (
              <div
                key={item.id}
                className={`card p-4 sm:p-5 transition-all ${
                  isVip
                    ? "border-fire/40 bg-gradient-to-r from-fire/10 via-surface to-surface"
                    : "border-line bg-surface"
                }`}
              >
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                  {/* Board Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeColor}`}
                      >
                        {meta.tag}
                      </span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateLabel(item.id, e.target.value)}
                        className="bg-transparent font-sans text-base font-bold text-cream border-b border-dashed border-transparent hover:border-line focus:border-fire focus:outline-none transition-colors"
                        title="Click to edit board title"
                      />
                    </div>
                    <p className="mt-1 text-xs text-mute">{meta.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-mute">
                        Live Preview:
                      </span>
                      <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-fire">
                        GHS {Number(item.priceGhs).toLocaleString()}
                      </span>
                      <span className="rounded bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                        ₦{Number(item.priceNgn).toLocaleString("en-NG")}
                      </span>
                    </div>
                  </div>

                  {/* Ghana Input (GHS) */}
                  <div>
                    <label className="block text-xs font-semibold text-mute">
                      🇬🇭 Ghana Price (GHS)
                    </label>
                    <div className="mt-1.5 flex items-center rounded-xl border border-line bg-paper px-3 py-1.5 focus-within:border-fire">
                      <span className="mr-2 text-xs font-extrabold text-fire">
                        GHS
                      </span>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        required
                        value={item.priceGhs === 0 ? "" : item.priceGhs}
                        onChange={(e) =>
                          updatePrice(
                            item.id,
                            "priceGhs",
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full bg-transparent font-mono text-sm font-bold text-cream outline-none"
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>

                  {/* Nigeria Input (NGN) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-mute">
                        🇳🇬 Nigeria Price (NGN)
                      </label>
                      <button
                        type="button"
                        onClick={() => autoCalculateNgn(item.id, exchangeRate)}
                        className="text-[11px] text-mute hover:text-emerald-400 underline"
                        title={`Calculate using 1 GHS = ${exchangeRate} NGN`}
                      >
                        auto calc (₦{exchangeRate})
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center rounded-xl border border-line bg-paper px-3 py-1.5 focus-within:border-emerald-500">
                      <span className="mr-2 text-xs font-extrabold text-emerald-400">
                        ₦
                      </span>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        required
                        value={item.priceNgn === 0 ? "" : item.priceNgn}
                        onChange={(e) =>
                          updatePrice(
                            item.id,
                            "priceNgn",
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-full bg-transparent font-mono text-sm font-bold text-cream outline-none"
                        placeholder="e.g. 3600"
                      />
                    </div>
                  </div>

                  {/* Quick Summary Pill */}
                  <div className="hidden lg:block text-right">
                    <p className="text-[11px] text-mute">Status</p>
                    <span className="inline-block mt-1 text-xs font-semibold text-emerald-400">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save Action Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur shadow-2xl">
        <p className="text-xs text-mute">
          Click <span className="font-semibold text-cream">Save All Prices</span>{" "}
          to apply changes to the live database and payment gateway.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary min-w-[160px] px-6 py-2.5 text-sm font-bold shadow-lg shadow-fire/20"
        >
          {saving ? "Saving…" : "Save All Prices"}
        </button>
      </div>
    </div>
  );
}
