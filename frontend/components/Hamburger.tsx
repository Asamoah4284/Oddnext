"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function HamburgerIcon({ open = false }: { open?: boolean }) {
  return (
    <span className="relative block h-3.5 w-4" aria-hidden>
      <span
        className={`absolute left-0 h-0.5 w-4 rounded-full bg-current transition ${
          open ? "top-1.5 rotate-45" : "top-0"
        }`}
      />
      <span
        className={`absolute left-0 top-1.5 h-0.5 w-4 rounded-full bg-current transition ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 h-0.5 w-4 rounded-full bg-current transition ${
          open ? "top-1.5 -rotate-45" : "top-3"
        }`}
      />
    </span>
  );
}

export function HamburgerMenu({
  label = "Open menu",
  align = "right",
  children,
}: {
  label?: string;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink hover:bg-paper"
        aria-label={label}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <HamburgerIcon open={open} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-11 z-30 min-w-40 rounded-2xl border border-line bg-surface p-1.5 shadow-slip ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  tone = "default",
  onClick,
}: {
  children: ReactNode;
  tone?: "default" | "danger";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
        tone === "danger" ? "text-lost hover:bg-lost/10" : "text-ink hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}
