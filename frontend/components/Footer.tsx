import Link from "next/link";
import { BRAND_NAME } from "@/lib/api";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold">{BRAND_NAME}</p>
          <p className="mt-3 text-sm text-mute">
            Predictions for Ghana and Nigeria. Not a bookmaker. Don’t stake what you can’t lose.
          </p>
        </div>
        <div className="text-sm">
          <p className="text-mute">Pages</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/">Home</Link>
            <Link href="/#tips">Boards</Link>
            <Link href="/profile">VIP</Link>
          </div>
        </div>
        <div className="text-sm text-mute">
          <p>18+ / play safe</p>
          <p className="mt-3">
            {BRAND_NAME} publishes opinions, not licensed odds. Use limits. If betting is hurting
            you, stop.
          </p>
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-mute">
        © {new Date().getFullYear()} {BRAND_NAME} · Ghana & Nigeria
      </div>
    </footer>
  );
}
