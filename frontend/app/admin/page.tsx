"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminLogin } from "@/components/AdminLogin";
import { useAuth } from "@/components/AuthProvider";
import { HamburgerMenu, MenuItem } from "@/components/Hamburger";
import { ApiError, apiFetch } from "@/lib/api";
import { datetimeLocalValue, formatDateTime } from "@/lib/format";
import { SLIP_PRODUCTS, productLabel } from "@/lib/products";
import type { AdminTip } from "@/lib/types";
import type { SlipProductId } from "@/lib/products";

const PAGE_SIZE = 8;

function Pager({
  page,
  pages,
  total,
  noun,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  noun: string;
  onPage: (next: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-mute">
        {total} {noun} · page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-outline px-3 py-1.5 text-xs"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Prev
        </button>
        <button
          type="button"
          className="btn-outline px-3 py-1.5 text-xs"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const emptyTip = {
  kickoffAt: "",
  league: "",
  homeTeam: "",
  awayTeam: "",
  prediction: "",
  odds: "1.50",
  product: "odds10" as SlipProductId,
  isVip: true,
  status: "pending" as AdminTip["status"],
};

function tipDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block font-sans text-xs font-medium tracking-normal text-mute">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export default function AdminPage() {
  const { user, token, logout } = useAuth();
  const [tips, setTips] = useState<AdminTip[]>([]);
  const [form, setForm] = useState(emptyTip);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [boardFilter, setBoardFilter] = useState<SlipProductId | "all">("all");
  const [tipsPage, setTipsPage] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [bookingDrafts, setBookingDrafts] = useState<Record<string, string>>({});
  const [bookingBusy, setBookingBusy] = useState("");

  function dropStaleSession() {
    logout();
  }

  async function loadTips() {
    if (!token) return;
    try {
      const data = await apiFetch<{ tips: AdminTip[] }>("/api/admin/tips", { token });
      setTips(data.tips);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        dropStaleSession();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load tips");
    }
  }

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    void loadTips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  async function saveTip(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      odds: Number(form.odds),
      kickoffAt: new Date(form.kickoffAt).toISOString(),
    };
    try {
      if (editingId) {
        await apiFetch(`/api/admin/tips/${editingId}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/tips", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });
      }
      setForm(emptyTip);
      setEditingId(null);
      setFormOpen(false);
      await loadTips();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save tip");
    } finally {
      setBusy(false);
    }
  }

  function editTip(tip: AdminTip) {
    setEditingId(tip.id);
    setForm({
      kickoffAt: datetimeLocalValue(tip.kickoffAt),
      league: tip.league,
      homeTeam: tip.homeTeam,
      awayTeam: tip.awayTeam,
      prediction: tip.prediction,
      odds: String(tip.odds),
      product: tip.product || "odds10",
      isVip: tip.isVip,
      status: tip.status,
    });
    setFormOpen(true);
  }

  async function patchTip(id: string, body: Partial<AdminTip>) {
    if (!token) return;
    try {
      await apiFetch(`/api/admin/tips/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      });
      await loadTips();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        dropStaleSession();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not update tip");
    }
  }

  async function saveBoardBooking(product: SlipProductId, date: string) {
    if (!token) return;
    const key = `${product}|${date}`;
    setBookingBusy(key);
    setError("");
    try {
      await apiFetch("/api/admin/boards/booking", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          product,
          date,
          bookingCode: (bookingDrafts[key] ?? "").trim(),
        }),
      });
      await loadTips();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save booking code");
    } finally {
      setBookingBusy("");
    }
  }

  async function deleteTip(id: string) {
    if (!token || !window.confirm("Delete this tip?")) return;
    try {
      await apiFetch(`/api/admin/tips/${id}`, { method: "DELETE", token });
      await loadTips();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        dropStaleSession();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not delete tip");
    }
  }

  const visibleTips =
    boardFilter === "all"
      ? tips
      : tips.filter((tip) => (tip.product || "odds10") === boardFilter);

  const slipGroups = useMemo(() => {
    const groups: {
      key: string;
      product: SlipProductId;
      date: string;
      code: string;
      tips: AdminTip[];
    }[] = [];
    const index = new Map<string, number>();
    const ordered = [...visibleTips].sort((a, b) => {
      const board = (a.product || "odds10").localeCompare(b.product || "odds10");
      if (board !== 0) return board;
      const day = tipDay(b.kickoffAt).localeCompare(tipDay(a.kickoffAt));
      if (day !== 0) return day;
      return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    });
    for (const tip of ordered) {
      const product = (tip.product || "odds10") as SlipProductId;
      const date = tipDay(tip.kickoffAt);
      const key = `${product}|${date}`;
      const existing = index.get(key);
      if (existing === undefined) {
        index.set(key, groups.length);
        groups.push({
          key,
          product,
          date,
          code: tip.bookingCode || "",
          tips: [tip],
        });
      } else {
        groups[existing].tips.push(tip);
        if (!groups[existing].code && tip.bookingCode) {
          groups[existing].code = tip.bookingCode;
        }
      }
    }
    return groups;
  }, [visibleTips]);

  const tipPages = Math.max(1, Math.ceil(slipGroups.length / PAGE_SIZE));
  const pagedGroups = useMemo(() => {
    const start = (tipsPage - 1) * PAGE_SIZE;
    return slipGroups.slice(start, start + PAGE_SIZE);
  }, [slipGroups, tipsPage]);

  useEffect(() => {
    setTipsPage(1);
  }, [boardFilter]);

  useEffect(() => {
    if (tipsPage > tipPages) setTipsPage(tipPages);
  }, [tipsPage, tipPages]);

  if (!user || user.role !== "admin") {
    return <AdminLogin />;
  }

  return (
    <main className="admin-ui min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs text-mute">Admin</p>
            <h1 className="text-lg font-extrabold sm:text-xl">Post odds</h1>
          </div>
          <Link href="/" className="text-sm font-semibold text-mute">
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">

        {error && <p className="mb-4 text-sm text-lost">{error}</p>}

        <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:gap-5">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <p className="text-sm font-semibold">Today’s games</p>
              <button
                type="button"
                className="btn-primary px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyTip);
                  setFormOpen((open) => !open);
                }}
              >
                {formOpen && !editingId ? "Close" : "Add pick"}
              </button>
            </div>
            <form
              onSubmit={saveTip}
              className={`card space-y-3 p-4 ${
                formOpen || editingId ? "block" : "hidden"
              } lg:block`}
            >
              <h2 className="text-base font-bold">
                {editingId ? "Edit pick" : "New pick"}
              </h2>
              <Field label="Odds board">
                <select
                  className="field"
                  value={form.product}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      product: e.target.value as SlipProductId,
                    })
                  }
                >
                  {SLIP_PRODUCTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} · GHS {item.priceGhs}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kickoff">
                <input
                  className="field"
                  type="datetime-local"
                  required
                  value={form.kickoffAt}
                  onChange={(e) => setForm({ ...form, kickoffAt: e.target.value })}
                />
              </Field>
              <Field label="League">
                <input
                  className="field"
                  required
                  value={form.league}
                  onChange={(e) => setForm({ ...form, league: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Home">
                  <input
                    className="field"
                    required
                    value={form.homeTeam}
                    onChange={(e) => setForm({ ...form, homeTeam: e.target.value })}
                  />
                </Field>
                <Field label="Away">
                  <input
                    className="field"
                    required
                    value={form.awayTeam}
                    onChange={(e) => setForm({ ...form, awayTeam: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pick">
                  <input
                    className="field"
                    required
                    placeholder="Over 1.5"
                    value={form.prediction}
                    onChange={(e) => setForm({ ...form, prediction: e.target.value })}
                  />
                </Field>
                <Field label="Odds">
                  <input
                    className="field"
                    type="number"
                    min={1}
                    step="0.01"
                    required
                    value={form.odds}
                    onChange={(e) => setForm({ ...form, odds: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Result">
                <select
                  className="field"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as AdminTip["status"] })
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </Field>
              <button className="btn-primary w-full py-2.5" disabled={busy} type="submit">
                {busy ? "Saving…" : editingId ? "Update pick" : "Post pick"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="w-full text-sm text-mute"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyTip);
                    setFormOpen(false);
                  }}
                >
                  Cancel
                </button>
              )}
            </form>

            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex gap-2 overflow-x-auto border-b border-line p-3">
                <button
                  type="button"
                  onClick={() => {
                    setBoardFilter("all");
                    setTipsPage(1);
                  }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    boardFilter === "all"
                      ? "bg-fire text-pitch-dark"
                      : "bg-paper text-mute"
                  }`}
                >
                  All boards
                </button>
                {SLIP_PRODUCTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBoardFilter(item.id);
                      setTipsPage(1);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      boardFilter === item.id
                        ? "bg-fire text-pitch-dark"
                        : "bg-paper text-mute"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div>
                {pagedGroups.map((group) => {
                  const draft = bookingDrafts[group.key] ?? group.code;
                  return (
                    <section key={group.key} className="border-t border-line">
                      <div className="flex items-center justify-between gap-3 bg-paper/80 px-4 py-2.5">
                        <p className="text-sm font-semibold">
                          {productLabel(group.product)}
                        </p>
                        <p className="text-xs text-mute">{group.date}</p>
                      </div>
                      {group.tips.map((tip) => (
                        <div
                          key={tip.id}
                          className="flex items-start justify-between gap-3 border-t border-line px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold">
                              {tip.homeTeam} vs {tip.awayTeam}
                            </p>
                            <p className="mt-0.5 text-xs text-mute">
                              {tip.league} · {formatDateTime(tip.kickoffAt)}
                            </p>
                            <p className="mt-1 text-sm">
                              {tip.prediction} @ {tip.odds}
                            </p>
                            {tip.status !== "pending" && (
                              <p
                                className={`mt-1 text-xs font-semibold capitalize ${
                                  tip.status === "won" ? "text-won" : "text-lost"
                                }`}
                              >
                                {tip.status}
                              </p>
                            )}
                          </div>
                          <HamburgerMenu
                            label={`Actions for ${tip.homeTeam} vs ${tip.awayTeam}`}
                          >
                            <MenuItem
                              onClick={() => void patchTip(tip.id, { status: "pending" })}
                            >
                              Mark pending
                            </MenuItem>
                            <MenuItem
                              onClick={() => void patchTip(tip.id, { status: "won" })}
                            >
                              Mark won
                            </MenuItem>
                            <MenuItem
                              onClick={() => void patchTip(tip.id, { status: "lost" })}
                            >
                              Mark lost
                            </MenuItem>
                            <MenuItem onClick={() => editTip(tip)}>Edit</MenuItem>
                            <MenuItem
                              tone="danger"
                              onClick={() => void deleteTip(tip.id)}
                            >
                              Delete
                            </MenuItem>
                          </HamburgerMenu>
                        </div>
                      ))}
                      <div className="border-t border-fire/20 bg-fire/5 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-fire">
                          Booking code for this slip
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            className="field"
                            placeholder="One SportyBet code under all these odds"
                            value={draft}
                            onChange={(e) =>
                              setBookingDrafts((current) => ({
                                ...current,
                                [group.key]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-outline shrink-0 px-4 py-2 text-sm"
                            disabled={bookingBusy === group.key}
                            onClick={() =>
                              void saveBoardBooking(group.product, group.date)
                            }
                          >
                            {bookingBusy === group.key ? "Saving…" : "Save code"}
                          </button>
                        </div>
                      </div>
                    </section>
                  );
                })}
                {pagedGroups.length === 0 && (
                  <p className="px-4 py-8 text-sm text-mute">No games on this board.</p>
                )}
              </div>
              <Pager
                page={tipsPage}
                pages={tipPages}
                total={slipGroups.length}
                noun={slipGroups.length === 1 ? "slip" : "slips"}
                onPage={setTipsPage}
              />
            </div>
          </div>
      </div>
    </main>
  );
}
