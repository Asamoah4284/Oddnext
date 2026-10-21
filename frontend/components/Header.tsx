"use client";

import Link from "next/link";
import { useState } from "react";
import { HamburgerIcon } from "@/components/Hamburger";
import { BRAND_NAME } from "@/lib/api";

export function Header({
  overlay = false,
}: {
  telegramCount?: number;
  telegramUrl?: string;
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/50 to-transparent"
          : "sticky top-0 z-40 border-b border-white/5 bg-paper/75 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-fire text-sm font-extrabold text-pitch-dark">
            ON
          </span>
          <span className="text-lg font-extrabold tracking-tight">{BRAND_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-mute md:flex">
          <a href="#tips" className="hover:text-ink">
            Live tips
          </a>
          <a href="#vip" className="hover:text-ink">
            VIP
          </a>
          <Link href="/profile" className="btn-primary">
            Get VIP
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Link href="/profile" className="btn-primary px-3 py-2 text-xs">
            Get VIP
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-ink"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <HamburgerIcon open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/10 bg-paper/95 px-4 py-4 text-sm backdrop-blur-xl md:hidden">
          <a href="#tips" onClick={() => setOpen(false)} className="block">
            Live tips
          </a>
          <a href="#vip" onClick={() => setOpen(false)} className="block">
            VIP
          </a>
          <Link href="/profile" className="btn-primary inline-flex">
            Get VIP
          </Link>
        </div>
      )}
    </header>
  );
}
