import Link from "next/link";
import { SLIP_PRODUCTS, VIP_PRODUCT } from "@/lib/products";

const blurbs: Record<string, string> = {
  odds10: "Banker slip",
  odds50: "Stronger acca",
  odds100: "High odds slip",
  draw: "Draws only",
  correctScore: "Exact scores",
  vip: "Every board open",
};

export function VipPromo({ price }: { price: number }) {
  const vipPrice = price || VIP_PRODUCT.priceGhs;

  return (
    <section id="vip" className="mx-auto max-w-6xl px-4 pb-4">
      <div className="overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top_right,#22c55e33,transparent_40%),linear-gradient(160deg,#141917,#0f1613)] p-5 sm:p-8 md:p-12">
        <p className="text-sm font-medium text-star">Boards + VIP</p>
        <h2 className="mt-2 text-2xl font-extrabold leading-snug sm:text-5xl">
          Pay one board, or unlock all.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-mute sm:text-base">
          Pick a slip and pay that price. VIP is GHS {vipPrice} and opens every
          board, with booking codes.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          {SLIP_PRODUCTS.map((item) => (
            <Link
              key={item.id}
              href="/profile"
              className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-4 first:border-t-0"
            >
              <div>
                <p className="text-base font-bold text-cream">{item.label}</p>
                <p className="mt-0.5 text-xs text-mute">{blurbs[item.id]}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-extrabold text-star">
                  GHS {item.priceGhs}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-mute">Pay</p>
              </div>
            </Link>
          ))}
          <Link
            href="/profile"
            className="flex items-center justify-between gap-4 border-t border-fire/30 bg-fire/10 px-4 py-4"
          >
            <div>
              <p className="text-base font-bold text-cream">{VIP_PRODUCT.label}</p>
              <p className="mt-0.5 text-xs text-mute">{blurbs.vip}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-extrabold text-star">GHS {vipPrice}</p>
              <p className="mt-0.5 text-xs font-semibold text-star">Join</p>
            </div>
          </Link>
        </div>

        <Link href="/profile" className="btn-primary mt-6 w-full sm:w-auto">
          Open pay page
        </Link>
      </div>
    </section>
  );
}
