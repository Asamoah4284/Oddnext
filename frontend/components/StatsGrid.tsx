import { compactCount } from "@/lib/format";
import type { SiteStats } from "@/lib/types";

function WinRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full sm:h-16 sm:w-16"
      style={{
        background: `conic-gradient(#22c55e ${clamped}%, #24302a 0)`,
      }}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-surface sm:h-12 sm:w-12">
        <span className="font-sans text-sm font-extrabold tracking-normal text-star">
          {clamped}%
        </span>
      </div>
    </div>
  );
}

export function StatsGrid({ stats }: { stats: SiteStats }) {
  const items = [
    { label: "Tips this month", value: String(stats.monthlyTips) },
    { label: "VIP members", value: compactCount(stats.vipMembers) },
    { label: "Telegram", value: compactCount(stats.telegramCount) },
  ];

  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 md:-mt-20">
      <div className="rounded-2xl border border-line bg-surface p-3 shadow-slip sm:p-4">
        <div className="flex items-center gap-3 rounded-xl bg-paper px-3 py-3">
          <WinRing value={stats.winRate} />
          <div className="min-w-0 font-sans tracking-normal">
            <p className="text-xs text-mute">Win rate</p>
            <p className="text-base font-bold leading-tight sm:text-lg">
              {stats.winRate}% landed
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl bg-paper px-2 py-3 text-center">
              <p className="font-sans text-[11px] leading-tight tracking-normal text-mute">
                {item.label}
              </p>
              <p className="mt-1 font-sans text-lg font-extrabold tracking-tight text-cream sm:text-2xl">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
