"use client";

import { useState, useId, useEffect } from "react";
import { parseBetslip, calculateCombinedOdds, type ParsedPickItem } from "@/lib/betslipParser";
import { datetimeLocalValue } from "@/lib/format";
import { productLabel, type SlipProductId } from "@/lib/products";
import { apiFetch } from "@/lib/api";
import { useProducts } from "@/components/ProductsProvider";

interface BetslipPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess: (count: number, board: string, bookingCode: string) => void;
  defaultBoard?: SlipProductId;
}

const SAMPLE_BETSLIP = `Booking Code: DEHLWF Odds: 16.53 Max Bonus: 12.50%
Selections:
AL Anwar vs Al-Wehda FC
Selection: Draw or Away (Double Chance)
Odd: 1.32
Ceramica Cleopatra vs Suez Petrojet
Selection: Home or Draw (Double Chance)
Odd: 1.28
Club Brugge vs Lens
Selection: Yes (Home Team or Over 2.5)
Odd: 1.17
Avro FC vs Ashton United FC
Selection: Over 1.5 (Over/Under)
Odd: 1.18
Como 1907 vs Man Utd
Selection: Over 1.5 (Over/Under)
Odd: 1.16
Bayern Munich vs Arsenal
Selection: Over 1.5 (Over/Under)
Odd: 1.17
Reading FC vs Leyton Orient London
Selection: Over 1.5 (Over/Under)
Odd: 1.20
AL Ahly SC (EGY) vs El Qanah FC
Selection: Over 1.5 - AL Ahly SC (EGY) Over/Under
Odd: 1.47
Real Madrid vs RB Leipzig
Selection: Over 1.5 - Real Madrid Over/Under
Odd: 1.16
Aston Villa vs Viking FK
Selection: Over 1.5 - Aston Villa Over/Under
Odd: 1.23
Inter vs Shakhtar D
Selection: Over 1.5 - Inter Over/Under
Odd: 1.21
Sporting vs LASK Linz
Selection: Over 1.5 - Sporting Over/Under
Odd: 1.27
Persija Jakarta vs Arema FC
Selection: Over 1.5 - Persija Jakarta Over/Under
Odd: 1.35`;

export function BetslipPasteModal({
  isOpen,
  onClose,
  token,
  onSuccess,
  defaultBoard = "odds10",
}: BetslipPasteModalProps) {
  const { slipProducts } = useProducts();
  const rawTextId = useId();

  // Initial upcoming time (rounded to next hour)
  const defaultKickoff = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return datetimeLocalValue(d.toISOString());
  };

  const [rawText, setRawText] = useState("");
  const [board, setBoard] = useState<SlipProductId>(defaultBoard);
  const [globalLeague, setGlobalLeague] = useState("Football");
  const [globalKickoff, setGlobalKickoff] = useState(defaultKickoff);
  const [bookingCode, setBookingCode] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedPickItem[]>([]);
  const [targetOdds, setTargetOdds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Sync board with defaultBoard when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultBoard) setBoard(defaultBoard);
      setError("");
    }
  }, [isOpen, defaultBoard]);

  // Handle parsing whenever rawText changes
  function handleTextChange(text: string) {
    setRawText(text);
    setError("");

    if (!text.trim()) {
      setParsedItems([]);
      setTargetOdds(null);
      return;
    }

    const result = parseBetslip(text);
    if (result.bookingCode) {
      setBookingCode(result.bookingCode);
    }
    const effectiveOdds =
      result.totalOdds ??
      (result.items.length > 0 ? calculateCombinedOdds(result.items) : null);

    if (result.totalOdds) {
      setTargetOdds(result.totalOdds);
    } else {
      setTargetOdds(null);
    }

    if (effectiveOdds) {
      // Auto-suggest board if not explicitly changed
      if (effectiveOdds >= 90) {
        setBoard("odds100");
      } else if (effectiveOdds >= 35) {
        setBoard("odds50");
      } else if (effectiveOdds >= 5) {
        setBoard("odds10");
      }
    }

    // Attach defaults to parsed items
    const itemsWithDefaults = result.items.map((it) => ({
      ...it,
      league: it.league || globalLeague,
      kickoffAt: it.kickoffAt || globalKickoff,
    }));

    setParsedItems(itemsWithDefaults);
  }

  function applyLeagueToAll() {
    setParsedItems((prev) =>
      prev.map((it) => ({ ...it, league: globalLeague }))
    );
  }

  function applyKickoffToAll() {
    setParsedItems((prev) =>
      prev.map((it) => ({ ...it, kickoffAt: globalKickoff }))
    );
  }

  function updateItem(id: string, field: keyof ParsedPickItem, value: string | number) {
    setParsedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  }

  function removeItem(id: string) {
    setParsedItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addItem() {
    const newItem: ParsedPickItem = {
      id: `pick-${Date.now()}`,
      homeTeam: "",
      awayTeam: "",
      prediction: "Over 1.5",
      odds: 1.5,
      league: globalLeague,
      kickoffAt: globalKickoff,
    };
    setParsedItems((prev) => [...prev, newItem]);
  }

  const combinedOdds = calculateCombinedOdds(parsedItems);

  async function handlePostAll() {
    if (!token) {
      setError("You are not logged in as admin.");
      return;
    }

    if (parsedItems.length === 0) {
      setError("No picks to post. Please paste a betslip first.");
      return;
    }

    // Validation
    for (let i = 0; i < parsedItems.length; i++) {
      const it = parsedItems[i];
      if (!it.homeTeam.trim() || !it.awayTeam.trim()) {
        setError(`Row #${i + 1} is missing a home or away team.`);
        return;
      }
      if (!it.prediction.trim()) {
        setError(`Row #${i + 1} is missing a prediction.`);
        return;
      }
      if (!it.odds || it.odds < 1) {
        setError(`Row #${i + 1} has invalid odds (must be >= 1.00).`);
        return;
      }
      const kickoff = it.kickoffAt || globalKickoff;
      if (!kickoff) {
        setError(`Row #${i + 1} is missing a kickoff date/time.`);
        return;
      }
    }

    setBusy(true);
    setError("");

    try {
      const payloadTips = parsedItems.map((it) => {
        const kickoffIso = new Date(it.kickoffAt || globalKickoff).toISOString();
        return {
          kickoffAt: kickoffIso,
          league: (it.league || globalLeague).trim() || "Football",
          homeTeam: it.homeTeam.trim(),
          awayTeam: it.awayTeam.trim(),
          prediction: it.prediction.trim(),
          odds: Number(it.odds),
          product: board,
          isVip: true,
          status: "pending" as const,
          bookingCode: bookingCode.trim(),
        };
      });

      // Try bulk endpoint first
      try {
        await apiFetch("/api/admin/tips/bulk", {
          method: "POST",
          token,
          body: JSON.stringify({
            tips: payloadTips,
            bookingCode: bookingCode.trim(),
          }),
        });
      } catch (bulkErr) {
        // Fallback: post individual items if /bulk is unavailable
        console.warn("Bulk API failed, falling back to sequential:", bulkErr);
        for (const tip of payloadTips) {
          await apiFetch("/api/admin/tips", {
            method: "POST",
            token,
            body: JSON.stringify(tip),
          });
        }
        if (bookingCode.trim()) {
          const firstDate = new Date(payloadTips[0].kickoffAt)
            .toISOString()
            .slice(0, 10);
          await apiFetch("/api/admin/boards/booking", {
            method: "PATCH",
            token,
            body: JSON.stringify({
              product: board,
              date: firstDate,
              bookingCode: bookingCode.trim(),
            }),
          });
        }
      }

      onSuccess(parsedItems.length, productLabel(board), bookingCode.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post picks");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-pitch-dark/85 p-3 backdrop-blur-sm sm:p-5">
      <div className="relative my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line bg-pitch/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fire/15 text-lg text-fire">
              📋
            </span>
            <div>
              <h2 className="text-base font-extrabold text-cream sm:text-lg">
                Paste Betslip & Arrange Picks
              </h2>
              <p className="text-xs text-mute">
                Paste text copied from SportyBet, Betway, or WhatsApp. Picks, odds, and booking code are auto-arranged.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-mute hover:bg-paper hover:text-white"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="rounded-xl border border-lost/30 bg-lost/10 px-4 py-3 text-sm text-lost">
              {error}
            </div>
          )}

          {/* Paste Input Box */}
          <div className="rounded-xl border border-line bg-paper/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <label
                htmlFor={rawTextId}
                className="font-sans text-xs font-bold uppercase tracking-wider text-fire"
              >
                1. Paste Betslip Text
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTextChange(SAMPLE_BETSLIP)}
                  className="rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-mute hover:border-mute hover:text-white border border-line"
                >
                  Load Sample Slip
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => handleTextChange("")}
                    className="text-xs font-semibold text-lost hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              id={rawTextId}
              rows={5}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste your betslip text here (e.g. Booking Code: DEHLWF ... Selections: ... AL Anwar vs Al-Wehda FC ...)"
              className="field font-mono text-xs sm:text-sm leading-relaxed"
            />
            {parsedItems.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full bg-fire/15 px-3 py-1 font-bold text-fire">
                  ✓ {parsedItems.length} {parsedItems.length === 1 ? "game" : "games"} detected
                </span>
                {bookingCode && (
                  <span className="rounded-full bg-paper px-3 py-1 font-semibold text-ink border border-line">
                    Code: <strong className="text-fire">{bookingCode}</strong>
                  </span>
                )}
                {targetOdds && (
                  <span className="rounded-full bg-paper px-3 py-1 font-semibold text-ink border border-line">
                    Betslip Odds: <strong className="text-star">{targetOdds}</strong>
                  </span>
                )}
                <span className="rounded-full bg-paper px-3 py-1 font-semibold text-ink border border-line">
                  Calculated Odds: <strong className="text-fire">{combinedOdds}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Slip Settings Bar */}
          <div className="rounded-xl border border-line bg-paper/40 p-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-fire mb-3">
              2. Slip Board & Defaults
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-mute mb-1">
                  Odds Board
                </label>
                <select
                  className="field py-2 text-xs font-semibold"
                  value={board}
                  onChange={(e) => setBoard(e.target.value as SlipProductId)}
                >
                  {slipProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} (GHS {p.priceGhs} / ₦{p.priceNgn?.toLocaleString("en-NG")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-mute mb-1">
                  Booking Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEHLWF"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  className="field py-2 text-xs font-mono font-bold tracking-wider"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-mute">
                    Default Kickoff
                  </label>
                  <button
                    type="button"
                    onClick={applyKickoffToAll}
                    className="text-[10px] font-semibold text-fire hover:underline"
                  >
                    Set all
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={globalKickoff}
                  onChange={(e) => {
                    setGlobalKickoff(e.target.value);
                  }}
                  className="field py-2 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-mute">
                    Default League
                  </label>
                  <button
                    type="button"
                    onClick={applyLeagueToAll}
                    className="text-[10px] font-semibold text-fire hover:underline"
                  >
                    Set all
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Football"
                  value={globalLeague}
                  onChange={(e) => {
                    setGlobalLeague(e.target.value);
                  }}
                  className="field py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Arranged Picks Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-fire">
                3. Arranged Selections ({parsedItems.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-outline px-3 py-1 text-xs"
                >
                  + Add Game
                </button>
              </div>
            </div>

            {parsedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-paper/20 p-8 text-center text-mute">
                <p className="text-sm">No selections arranged yet.</p>
                <p className="mt-1 text-xs text-mute/80">
                  Paste betslip text above or click <strong>Load Sample Slip</strong> to test.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line bg-paper/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-pitch/80 text-[11px] font-bold uppercase tracking-wider text-mute">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2 w-8">#</th>
                      <th className="py-2.5 px-2">Home Team</th>
                      <th className="py-2.5 px-2">Away Team</th>
                      <th className="py-2.5 px-2">Pick / Prediction</th>
                      <th className="py-2.5 px-2 w-20">Odds</th>
                      <th className="py-2.5 px-2 w-28 hidden md:table-cell">League</th>
                      <th className="py-2.5 px-2 w-36 hidden lg:table-cell">Kickoff</th>
                      <th className="py-2.5 pr-3 pl-2 w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {parsedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-surface/50 transition">
                        <td className="py-2 pl-3 pr-2 font-mono text-mute text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.homeTeam}
                            onChange={(e) => updateItem(item.id, "homeTeam", e.target.value)}
                            placeholder="Home Team"
                            className="w-full rounded-lg border border-line/70 bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-fire outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.awayTeam}
                            onChange={(e) => updateItem(item.id, "awayTeam", e.target.value)}
                            placeholder="Away Team"
                            className="w-full rounded-lg border border-line/70 bg-paper px-2.5 py-1.5 text-xs text-ink focus:border-fire outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.prediction}
                            onChange={(e) => updateItem(item.id, "prediction", e.target.value)}
                            placeholder="e.g. Over 1.5"
                            className="w-full rounded-lg border border-line/70 bg-paper px-2.5 py-1.5 text-xs text-fire font-medium focus:border-fire outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={item.odds}
                            onChange={(e) =>
                              updateItem(item.id, "odds", parseFloat(e.target.value) || 1)
                            }
                            className="w-20 rounded-lg border border-line/70 bg-paper px-2 py-1.5 text-xs font-mono font-bold text-ink focus:border-fire outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 hidden md:table-cell">
                          <input
                            type="text"
                            value={item.league || globalLeague}
                            onChange={(e) => updateItem(item.id, "league", e.target.value)}
                            className="w-full rounded-lg border border-line/70 bg-paper px-2 py-1.5 text-xs text-mute focus:border-fire outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 hidden lg:table-cell">
                          <input
                            type="datetime-local"
                            value={item.kickoffAt || globalKickoff}
                            onChange={(e) => updateItem(item.id, "kickoffAt", e.target.value)}
                            className="w-full rounded-lg border border-line/70 bg-paper px-2 py-1.5 text-[11px] text-mute focus:border-fire outline-none"
                          />
                        </td>
                        <td className="py-2 pr-3 pl-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded p-1 text-mute hover:bg-lost/20 hover:text-lost transition"
                            title="Remove game"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-pitch/90 px-5 py-4">
          <div className="flex items-center gap-3 text-xs text-mute">
            {parsedItems.length > 0 && (
              <span>
                Total: <strong className="text-white">{parsedItems.length} games</strong> ·{" "}
                Odds: <strong className="text-fire">{combinedOdds}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-outline px-4 py-2 text-xs"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary px-5 py-2 text-xs font-bold"
              disabled={busy || parsedItems.length === 0}
              onClick={handlePostAll}
            >
              {busy
                ? "Posting Picks…"
                : `Post All ${parsedItems.length > 0 ? `${parsedItems.length} Picks` : ""} to ${productLabel(board)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
