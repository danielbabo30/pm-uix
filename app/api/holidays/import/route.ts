import { NextRequest, NextResponse } from 'next/server';
import { HebrewCalendar, flags } from '@hebcal/core';
import { connectDB, HolidayModel, getNextId } from '@/db/mongodb';

export interface ImportHolidaysBody {
  year: number;
  categories: string[]; // 'major' | 'modern' | 'chanukah' | 'purim' | 'cholhamoed' | 'fasts'
}

interface HebEvent {
  getDate(): { greg(): Date };
  renderBrief(lang: string): string;
  getFlags(): number;
}

// ── Map English event name → holiday family key & Hebrew display title ─────
//    Events in the same family get merged into one date range.
const FAMILY_MAP: { test: (en: string) => boolean; key: string; title: string }[] = [
  { test: en => en.startsWith('Rosh Hashana'),                                              key: 'rosh-hashana', title: 'ראש השנה'  },
  { test: en => en.startsWith('Yom Kippur'),                                                key: 'yom-kippur',   title: 'יום כיפור' },
  { test: en => en.startsWith('Sukkot') || en.startsWith('Hoshana Raba') || en.startsWith('Shmini Atzeret'), key: 'sukkot', title: 'סוכות' },
  { test: en => en.startsWith('Pesach'),                                                    key: 'passover',     title: 'פסח'       },
  { test: en => en.startsWith('Shavuot'),                                                   key: 'shavuot',      title: 'שבועות'    },
  { test: en => en.startsWith('Chanukah') || en.startsWith('Hanukkah'),                    key: 'chanukah',     title: 'חנוכה'     },
];

function getFamily(titleEn: string): { key: string; title: string } {
  for (const fm of FAMILY_MAP) {
    if (fm.test(titleEn)) return { key: fm.key, title: fm.title };
  }
  // No family match → use title as its own unique key (no grouping)
  return { key: `single:${titleEn}`, title: '' };
}

// ── Build grouped holiday entries ─────────────────────────────────────────────
function buildEntries(
  year: number,
  categories: string[],
): { title: string; start_date: string; end_date: string }[] {
  const events: HebEvent[] = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
  }) as HebEvent[];

  // family-key → { title, dates[] }
  const groups = new Map<string, { title: string; titleHe: string; dates: string[] }>();

  const add = (familyKey: string, familyTitle: string, titleHe: string, date: string) => {
    if (!groups.has(familyKey)) {
      groups.set(familyKey, { title: familyTitle || titleHe, titleHe, dates: [] });
    }
    groups.get(familyKey)!.dates.push(date);
  };

  const NOISE =
    flags.ROSH_CHODESH   |
    flags.SPECIAL_SHABBAT |
    flags.PARSHA_HASHAVUA |
    flags.DAF_YOMI        |
    flags.OMER_COUNT      |
    flags.SHABBAT_MEVARCHIM |
    flags.MOLAD           |
    flags.CHANUKAH_CANDLES |  // handled separately
    flags.MISHNA_YOMI     |
    flags.YOM_KIPPUR_KATAN |
    flags.YERUSHALMI_YOMI |
    flags.NACH_YOMI       |
    flags.DAILY_LEARNING  |
    flags.YIZKOR;

  // Exact match to avoid matching "Yom HaAliyah School Observance" etc.
  // Note: hebcal uses U+2019 RIGHT SINGLE QUOTATION MARK in "Yom HaAtzma\u2019ut"
  const MAIN_MODERN = new Set([
    'Yom HaShoah',
    'Yom HaZikaron',
    'Yom HaAtzma\u2019ut',
    'Yom Yerushalayim',
    'Yom HaAliyah',
  ]);

  for (const ev of events) {
    const f       = ev.getFlags();
    const titleHe = ev.renderBrief('he');
    const titleEn = ev.renderBrief('en');
    const date    = ev.getDate().greg().toISOString().slice(0, 10);

    // Skip noise events
    if (f & NOISE) continue;
    // Skip pure erev events (CHAG+erev events are real Yom Tov → keep)
    if ((f & flags.EREV) && !(f & flags.CHAG)) continue;

    let include = false;
    if (categories.includes('major')      && (f & flags.CHAG))                                                        include = true;
    if (categories.includes('modern')     && (f & flags.MODERN_HOLIDAY) && MAIN_MODERN.has(titleEn)) include = true;
    if (categories.includes('purim')      && (f & flags.MINOR_HOLIDAY)  && titleEn.includes('Purim') && !titleEn.includes('Shushan')) include = true;
    if (categories.includes('cholhamoed') && (f & flags.CHOL_HAMOED))                                                 include = true;
    if (categories.includes('fasts')      && ((f & flags.MINOR_FAST) || (f & flags.MAJOR_FAST)) && !(f & flags.CHAG)) include = true;

    if (!include) continue;

    const { key, title } = getFamily(titleEn);
    add(key, title, titleHe, date);
  }

  // ── Chanukah: group all candle-lighting days into one range ────────────────
  if (categories.includes('chanukah')) {
    const chanukahDays = events
      .filter(e => e.getFlags() & flags.CHANUKAH_CANDLES)
      .map(e => e.getDate().greg().toISOString().slice(0, 10))
      .sort();
    if (chanukahDays.length) {
      groups.set('chanukah', {
        title:   'חנוכה',
        titleHe: 'חנוכה',
        dates:   chanukahDays,
      });
    }
  }

  // ── Convert groups → sorted entries ───────────────────────────────────────
  const entries: { title: string; start_date: string; end_date: string }[] = [];

  for (const { title, dates } of groups.values()) {
    if (!dates.length) continue;
    const sorted = [...dates].sort();
    entries.push({
      title,
      start_date: sorted[0],
      end_date:   sorted[sorted.length - 1],
    });
  }

  entries.sort((a, b) => a.start_date.localeCompare(b.start_date));
  return entries;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: ImportHolidaysBody = await req.json();
    const { year, categories } = body;

    if (!year || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'year and categories are required' }, { status: 400 });
    }
    if (year < 2020 || year > 2050) {
      return NextResponse.json({ error: 'שנה לא תקינה' }, { status: 400 });
    }

    await connectDB();

    const entries = buildEntries(year, categories);

    // Detect duplicates by start_date within the requested year
    const existing = await HolidayModel.find({
      start_date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
    });
    const existingDates = new Set(existing.map((h: { start_date: string }) => h.start_date));

    let added   = 0;
    let skipped = 0;
    const addedItems: object[] = [];

    for (const entry of entries) {
      if (existingDates.has(entry.start_date)) {
        skipped++;
        continue;
      }
      const id  = await getNextId('holidays');
      const doc = await HolidayModel.create({
        id,
        title:      entry.title,
        start_date: entry.start_date,
        end_date:   entry.end_date,
      });
      addedItems.push({
        id:         doc.id,
        title:      doc.title,
        start_date: doc.start_date,
        end_date:   doc.end_date,
        created_at: doc.created_at,
      });
      existingDates.add(entry.start_date);
      added++;
    }

    return NextResponse.json({ added, skipped, holidays: addedItems });
  } catch (err) {
    console.error('[POST /api/holidays/import]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
