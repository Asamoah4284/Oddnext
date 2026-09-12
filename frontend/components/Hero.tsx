"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    image: "/hero/1.jpg",
    kicker: "Today’s board",
    title: "Bankers before kickoff.",
    subtitle: "10, 50, 100+ odds, draws, and correct scores. Codes before kickoff.",
  },
  {
    image: "/hero/2.jpg",
    kicker: "Community",
    title: "The slip hits Telegram first.",
    subtitle: "Codes, late injuries, and who cashed. Accra and Lagos in one chat.",
  },
  {
    image: "/hero/3.jpg",
    kicker: "VIP · all boards",
    title: "GHS 1500 unlocks every board.",
    subtitle: "Or pay one board. SportyBet and BetPawa codes. No free tips.",
  },
];

export function Hero({ telegramUrl }: { telegramUrl: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const slide = slides[index];

  return (
    <section className="relative isolate min-h-[34rem] w-full overflow-hidden sm:min-h-[40rem] md:min-h-[100svh]">
      {slides.map((item, i) => (
        <img
          key={item.image}
          src={item.image}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          onError={(e) => {
            e.currentTarget.src = "/hero/1.jpg";
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-paper via-black/40 to-black/25" />

      <div className="relative mx-auto flex min-h-[34rem] max-w-6xl flex-col justify-end px-4 pb-16 pt-24 sm:min-h-[40rem] sm:pb-20 md:min-h-[100svh] md:pb-36 md:pt-28">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-fire/20 px-3 py-1 text-xs font-semibold text-star ring-1 ring-fire/30">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fire" />
          {slide.kicker}
        </span>
        <h1 className="mt-4 max-w-4xl font-sans text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
          Pay first. Then you see the odds.
        </h1>
        <p className="mt-3 max-w-xl font-sans text-sm tracking-normal text-white/75 sm:text-base md:text-xl">
          {slide.subtitle}
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:mt-8 sm:w-auto sm:flex-row sm:gap-3">
          <a href="#tips" className="btn-primary w-full px-6 py-3 sm:w-auto">
            Start Winning Today
          </a>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost w-full px-6 py-3 sm:w-auto"
          >
            Join Community
          </a>
        </div>
        <Link
          href="/profile"
          className="mt-4 text-xs text-white/55 hover:text-white sm:text-sm"
        >
          Pay a board, or GHS 1500 for VIP. Nothing is posted free.
        </Link>
      </div>

      <div className="absolute bottom-6 left-4 flex gap-1.5 md:bottom-36 md:left-auto md:right-10">
        {slides.map((item, i) => (
          <button
            key={item.title}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-fire" : "w-3 bg-white/35"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
