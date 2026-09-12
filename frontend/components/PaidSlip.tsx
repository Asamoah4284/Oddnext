import { getProduct } from "@/lib/products";
import type { PaidTip } from "@/lib/payments";

export function PaidSlip({
  tips,
  product,
  smsSent,
}: {
  tips: PaidTip[];
  product?: string;
  smsSent?: boolean;
}) {
  const label = getProduct(product ?? "")?.label ?? "Board";
  const codes = [...new Set(tips.map((tip) => tip.bookingCode).filter(Boolean))];

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="border-b border-line px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-fire">
          Unlocked
        </p>
        <h3 className="mt-1 text-xl font-extrabold text-cream">{label}</h3>
        <p className="mt-1 text-sm text-mute">
          {smsSent
            ? "Payment confirmed. The same slip was sent to your Mobile Money number."
            : "Payment confirmed. Your slip is unlocked below."}
        </p>
      </div>
      {tips.length === 0 ? (
        <p className="px-4 py-6 text-sm text-mute">
          This board is open. Nothing posted on it yet.
        </p>
      ) : (
        tips.map((tip) => (
          <div
            key={tip.id}
            className="flex items-start justify-between gap-3 border-t border-line px-4 py-3 first:border-t-0"
          >
            <div>
              <p className="text-xs text-mute">{tip.league}</p>
              <p className="text-sm font-semibold">
                {tip.homeTeam} vs {tip.awayTeam}
              </p>
              <p className="text-sm text-star">{tip.prediction}</p>
            </div>
            <p className="font-mono text-sm">@{tip.odds}</p>
          </div>
        ))
      )}
      {codes.length > 0 && (
        <div className="flex items-center justify-between bg-paper/80 px-4 py-2.5">
          <span className="text-xs text-mute">Booking code</span>
          <span className="font-mono text-sm font-semibold text-star">
            {codes.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
