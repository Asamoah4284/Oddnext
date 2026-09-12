import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { connectDb, disconnectDb } from "../db.js";
import { Payment } from "../models/Payment.js";
import { getOrCreateStats } from "../models/Stats.js";
import { Tip } from "../models/Tip.js";
import { User } from "../models/User.js";
import { addDays, startOfDay } from "../utils/dates.js";

function atHour(dayOffset: number, hour: number, minute = 0): Date {
  const d = startOfDay(addDays(new Date(), dayOffset));
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function seedDatabase(reset = true): Promise<void> {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Tip.deleteMany({}),
      Payment.deleteMany({}),
    ]);
  }

  const [adminHash, userHash, vipHash] = await Promise.all([
    bcrypt.hash(config.adminPassword, 12),
    bcrypt.hash("User123!", 12),
    bcrypt.hash("Vip123!", 12),
  ]);

  await User.create([
    {
      name: "System Admin",
      email: config.adminEmail,
      password: adminHash,
      role: "admin",
      isVip: true,
      entitlements: [],
      vipExpiresAt: addDays(new Date(), 365),
    },
    {
      name: "Kwame Mensah",
      email: "user@oddnext.com",
      password: userHash,
      role: "user",
      entitlements: [],
    },
    {
      name: "Adaobi Okonkwo",
      email: "vip@oddnext.com",
      password: vipHash,
      role: "user",
      isVip: true,
      entitlements: [],
      vipExpiresAt: addDays(new Date(), 30),
    },
  ]);

  await Tip.create([
    {
      kickoffAt: atHour(-1, 16, 0),
      league: "Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Brentford",
      prediction: "Home",
      odds: 1.55,
      status: "won",
      product: "odds10",
      isVip: true,
      bookingCode: "SB-YEST-01",
    },
    {
      kickoffAt: atHour(-1, 16, 0),
      league: "Premier League",
      homeTeam: "Chelsea",
      awayTeam: "Fulham",
      prediction: "Over 1.5",
      odds: 1.38,
      status: "won",
      product: "odds10",
      isVip: true,
      bookingCode: "SB-YEST-01",
    },
    {
      kickoffAt: atHour(-1, 18, 30),
      league: "La Liga",
      homeTeam: "Sevilla",
      awayTeam: "Valencia",
      prediction: "Draw",
      odds: 3.4,
      status: "lost",
      product: "draw",
      isVip: true,
      bookingCode: "DRAW-YEST",
    },
    {
      kickoffAt: atHour(-1, 20, 0),
      league: "Serie A",
      homeTeam: "Atalanta",
      awayTeam: "Roma",
      prediction: "Over 2.5",
      odds: 1.85,
      status: "won",
      product: "odds50",
      isVip: true,
      bookingCode: "ODDS50-YEST",
    },
    {
      kickoffAt: atHour(0, 15, 0),
      league: "Premier League",
      homeTeam: "Liverpool",
      awayTeam: "Everton",
      prediction: "Home",
      odds: 1.42,
      status: "pending",
      product: "odds10",
      isVip: true,
      bookingCode: "SB-TODAY-01",
    },
    {
      kickoffAt: atHour(0, 15, 0),
      league: "Premier League",
      homeTeam: "Man City",
      awayTeam: "Wolves",
      prediction: "Over 1.5",
      odds: 1.28,
      status: "pending",
      product: "odds10",
      isVip: true,
      bookingCode: "SB-TODAY-01",
    },
    {
      kickoffAt: atHour(0, 17, 30),
      league: "Ligue 1",
      homeTeam: "PSG",
      awayTeam: "Lille",
      prediction: "Home",
      odds: 1.5,
      status: "pending",
      product: "odds50",
      isVip: true,
      bookingCode: "ODDS50-TODAY",
    },
    {
      kickoffAt: atHour(0, 19, 45),
      league: "Bundesliga",
      homeTeam: "Bayern",
      awayTeam: "Gladbach",
      prediction: "Over 2.5",
      odds: 1.4,
      status: "pending",
      product: "odds50",
      isVip: true,
      bookingCode: "ODDS50-TODAY",
    },
    {
      kickoffAt: atHour(0, 20, 0),
      league: "Champions League",
      homeTeam: "Real Madrid",
      awayTeam: "Inter",
      prediction: "Home or Over 1.5",
      odds: 1.65,
      status: "pending",
      product: "odds100",
      isVip: true,
      bookingCode: "ODDS100-TODAY",
    },
    {
      kickoffAt: atHour(0, 20, 0),
      league: "Champions League",
      homeTeam: "Barcelona",
      awayTeam: "Dortmund",
      prediction: "BTTS",
      odds: 1.7,
      status: "pending",
      product: "odds100",
      isVip: true,
      bookingCode: "ODDS100-TODAY",
    },
    {
      kickoffAt: atHour(0, 16, 0),
      league: "Eredivisie",
      homeTeam: "Ajax",
      awayTeam: "Feyenoord",
      prediction: "2-1",
      odds: 8.5,
      status: "pending",
      product: "correctScore",
      isVip: true,
      bookingCode: "CS-TODAY",
    },
    {
      kickoffAt: atHour(0, 18, 0),
      league: "Serie A",
      homeTeam: "Juventus",
      awayTeam: "Napoli",
      prediction: "Draw",
      odds: 3.2,
      status: "pending",
      product: "draw",
      isVip: true,
      bookingCode: "DRAW-TODAY",
    },
  ]);

  const stats = await getOrCreateStats();
  stats.winRate = 91;
  stats.monthlyTips = 340;
  stats.vipMembers = 1864;
  stats.telegramCount = 102400;
  stats.telegramUrl = "https://t.me/oddnext";
  stats.vipPriceGhs = config.vipPriceGhs;
  await stats.save();

  console.log("Seeded Oddnext data");
  console.log(`Admin  ${config.adminEmail} / ${config.adminPassword}`);
  console.log("User   user@oddnext.com / User123!");
  console.log("VIP    vip@oddnext.com / Vip123!");
}

export async function ensureAdmin(): Promise<void> {
  const password = await bcrypt.hash(config.adminPassword, 12);
  await User.findOneAndUpdate(
    { email: config.adminEmail },
    {
      $set: {
        name: "System Admin",
        password,
        role: "admin",
        isVip: true,
      },
    },
    { upsert: true }
  );
}

export async function seedIfEmpty(): Promise<void> {
  const count = await User.countDocuments();
  if (count === 0) {
    await seedDatabase(false);
  }
  await Tip.updateMany(
    { $or: [{ product: { $exists: false } }, { product: null }, { product: "" }] },
    { $set: { product: "odds10" } }
  );
  const stats = await getOrCreateStats();
  if (!stats.vipPriceGhs || stats.vipPriceGhs < 1500) {
    stats.vipPriceGhs = 1500;
    await stats.save();
  }
  await ensureAdmin();
}

const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
  connectDb()
    .then(() => seedDatabase(true))
    .then(() => disconnectDb())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
