import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { StatsGrid } from "@/components/StatsGrid";
import { TelegramPromo } from "@/components/TelegramPromo";
import { TipsTable } from "@/components/TipsTable";
import { VipPromo } from "@/components/VipPromo";
import { WelcomeModal } from "@/components/WelcomeModal";
import { BRAND_NAME, fallbackStats, fetchStats, fetchTips, SITE_URL } from "@/lib/api";

export default async function HomePage() {
  const [stats, tips] = await Promise.all([
    fetchStats().catch(() => fallbackStats),
    fetchTips("today").catch(() => ({
      tab: "today" as const,
      board: "odds10" as const,
      vipAccess: false,
      boardAccess: false,
      entitlements: [],
      tips: [],
    })),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: BRAND_NAME,
        url: SITE_URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WelcomeModal stats={stats} />
      <Header
        overlay
        telegramCount={stats.telegramCount}
        telegramUrl={stats.telegramUrl}
      />
      <main>
        <Hero telegramUrl={stats.telegramUrl} />
        <StatsGrid stats={stats} />
        <TipsTable initial={tips} />
        <VipPromo price={stats.vipPriceGhs} />
        <TelegramPromo count={stats.telegramCount} url={stats.telegramUrl} />
      </main>
      <Footer />
    </>
  );
}
