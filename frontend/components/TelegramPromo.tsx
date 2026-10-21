import { compactCount } from "@/lib/format";

export function TelegramPromo({
  count,
  url,
}: {
  count: number;
  url: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-7">
        <div className="min-w-0 font-sans tracking-normal">
          <p className="text-xs text-mute">Telegram group</p>
          <p className="mt-0.5 text-xl font-extrabold leading-tight sm:text-2xl">
            {compactCount(count)} members
          </p>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            Live scores and slip talk from Accra, Kumasi, Lagos and Abuja.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-full items-center justify-center rounded-full bg-[#2aa3d4] px-5 py-3 text-sm font-semibold text-white md:mt-0 md:w-auto"
        >
          Join Telegram
        </a>
      </div>
    </section>
  );
}
