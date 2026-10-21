export interface ParsedPickItem {
  id: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  league?: string;
  kickoffAt?: string;
}

export interface ParseBetslipResult {
  bookingCode: string;
  totalOdds: number | null;
  items: ParsedPickItem[];
  rawText: string;
}

/**
 * Robust betslip text parser.
 * Handles:
 * - SportyBet / Betway style betslips with "Booking Code: ... Selections: ... Selection: ... Odd: ..."
 * - 3-line format: "Team A vs Team B \n Prediction \n 1.35"
 * - Tab/pipe separated CSV lines: "Team A vs Team B | Prediction | 1.35"
 * - Various separators: "vs", "vs.", "v", "-"
 */
export function parseBetslip(text: string): ParseBetslipResult {
  const result: ParseBetslipResult = {
    bookingCode: "",
    totalOdds: null,
    items: [],
    rawText: text,
  };

  if (!text || !text.trim()) return result;

  // 1. Extract booking code
  const codeMatch = text.match(
    /(?:booking\s*code|booking\s*id|code|slip\s*code)\s*[:=\-]?\s*([A-Za-z0-9\-_]+)/i
  );
  if (codeMatch && codeMatch[1]) {
    const val = codeMatch[1].trim();
    if (!/^(odds?|selections?|total)$/i.test(val)) {
      result.bookingCode = val;
    }
  }

  // Extract total odds from header or text
  const totalOddsMatch =
    text.match(/(?:total\s+odds|total)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i) ||
    text.match(/booking\s*code[^\n]*\bodds?\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (totalOddsMatch && totalOddsMatch[1]) {
    const parsed = parseFloat(totalOddsMatch[1]);
    if (!isNaN(parsed)) {
      result.totalOdds = parsed;
    }
  }

  // 2. Normalize lines
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Filter out pure header/metadata lines
  const lines = rawLines.filter((l) => {
    if (/^selections?:?$/i.test(l)) return false;
    if (/^booking\s*code\s*[:=\-]/i.test(l)) return false;
    if (/^max\s*bonus/i.test(l)) return false;
    if (/^betslip\s*(details|summary)?:?$/i.test(l)) return false;
    return true;
  });

  let currentItem: Partial<ParsedPickItem> | null = null;
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Single-line pipe / tab / semicolon separated format:
    // e.g. "AL Anwar vs Al-Wehda FC | Draw or Away (Double Chance) | 1.32"
    if (line.includes("|") || line.includes("\t") || line.includes(";")) {
      const parts = line
        .split(/[|\t;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 3 && isMatchTeams(parts[0])) {
        if (currentItem && currentItem.homeTeam && currentItem.prediction) {
          result.items.push(finishItem(currentItem, idCounter++));
          currentItem = null;
        }
        const { home, away } = splitTeams(parts[0]);
        const oddsVal = parseFloat(parts[2].replace(/[^0-9.]/g, "")) || 1.5;
        result.items.push({
          id: `pick-${idCounter++}-${Date.now()}`,
          homeTeam: home,
          awayTeam: away,
          prediction: parts[1],
          odds: oddsVal,
        });
        continue;
      }
    }

    // Check if line is "Selection: ..." or "Pick: ..." or "Tip: ..."
    const selMatch = line.match(/^(?:selection|pick|prediction|tip)\s*[:\-]\s*(.+)$/i);
    if (selMatch) {
      if (currentItem) {
        currentItem.prediction = selMatch[1].trim();
      } else if (i > 0 && isMatchTeams(lines[i - 1])) {
        const { home, away } = splitTeams(lines[i - 1]);
        currentItem = {
          homeTeam: home,
          awayTeam: away,
          prediction: selMatch[1].trim(),
          odds: 1.5,
        };
      }
      continue;
    }

    // Check if line is "Odd: 1.32" or "Odds: 1.32" or "@ 1.32"
    const oddMatch = line.match(/^(?:odd|odds|@)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)$/i);
    if (oddMatch) {
      const val = parseFloat(oddMatch[1]);
      if (currentItem) {
        currentItem.odds = isNaN(val) ? 1.5 : val;
        if (currentItem.homeTeam && currentItem.awayTeam) {
          result.items.push(finishItem(currentItem, idCounter++));
          currentItem = null;
        }
      }
      continue;
    }

    // Check if line is a pure decimal number (standalone odds e.g. "1.32")
    const standaloneNumberMatch = line.match(/^([0-9]+(?:\.[0-9]+)?)$/);
    if (standaloneNumberMatch && currentItem && currentItem.prediction) {
      const val = parseFloat(standaloneNumberMatch[1]);
      currentItem.odds = isNaN(val) ? 1.5 : val;
      result.items.push(finishItem(currentItem, idCounter++));
      currentItem = null;
      continue;
    }

    // Check if line is a team matchup like "AL Anwar vs Al-Wehda FC"
    if (isMatchTeams(line)) {
      if (currentItem && currentItem.homeTeam && currentItem.prediction) {
        result.items.push(finishItem(currentItem, idCounter++));
      }
      const { home, away } = splitTeams(line);
      currentItem = {
        homeTeam: home,
        awayTeam: away,
        prediction: "",
        odds: 1.5,
      };
      continue;
    }

    // If currentItem exists but has no prediction yet, and line doesn't match above, it's the prediction
    if (currentItem && !currentItem.prediction && !isMatchTeams(line)) {
      currentItem.prediction = line;
      continue;
    }
  }

  if (currentItem && currentItem.homeTeam && currentItem.prediction) {
    result.items.push(finishItem(currentItem, idCounter++));
  }

  return result;
}

function finishItem(item: Partial<ParsedPickItem>, count: number): ParsedPickItem {
  return {
    id: item.id || `pick-${count}-${Date.now()}`,
    homeTeam: (item.homeTeam || "").trim(),
    awayTeam: (item.awayTeam || "").trim(),
    prediction: (item.prediction || "").trim(),
    odds: typeof item.odds === "number" && !isNaN(item.odds) ? item.odds : 1.5,
    league: item.league || "",
    kickoffAt: item.kickoffAt || "",
  };
}

export function isMatchTeams(str: string): boolean {
  if (!str) return false;
  // Must contain vs, vs., v, or - between words
  if (!/\s+(?:vs\.?|v\.?|-)\s+/i.test(str)) return false;
  // Exclude labels or headers
  if (/^(?:booking|selection|odd|odds|max\s*bonus|date|time|league|status)/i.test(str)) {
    return false;
  }
  return true;
}

export function splitTeams(str: string): { home: string; away: string } {
  const parts = str.split(/\s+(?:vs\.?|v\.?|-)\s+/i);
  if (parts.length >= 2) {
    return {
      home: parts[0].trim(),
      away: parts.slice(1).join(" vs ").trim(),
    };
  }
  return { home: str.trim(), away: "" };
}

export function calculateCombinedOdds(items: { odds: number }[]): number {
  if (items.length === 0) return 0;
  const product = items.reduce((acc, it) => acc * (it.odds || 1), 1);
  return Math.round(product * 100) / 100;
}
