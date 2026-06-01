import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SpecDocument {
  title:              string;
  summary:            string;
  actors:             string[];
  trigger:            string;
  mainFlow:           string[];
  alternativeFlows:   { name: string; steps: string[] }[];
  validations:        string[];
  errorHandling:      string[];
  edgeCases:          string[];
  permissions:        string[];
  integrations:       string[];
  nonFunctional:      string[];
  uiRequirements:     string[];
  openQuestions:      string[];
}

// ── Build Word document from spec data ────────────────────────────────────────
function buildDocx(spec: SpecDocument, taskTitle: string): Document {
  const today = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date());

  const rtl = { bidirectional: true } as const;

  const h1 = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      ...rtl,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300, after: 120 },
    });

  const h2 = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      ...rtl,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 240, after: 80 },
    });

  const body = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, size: 22 })],
      ...rtl,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 },
    });

  const bullet = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: `• ${text}`, size: 22 })],
      ...rtl,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      indent: { right: 360 },
    });

  const numbered = (text: string, n: number) =>
    new Paragraph({
      children: [new TextRun({ text: `${n}. ${text}`, size: 22 })],
      ...rtl,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      indent: { right: 360 },
    });

  const divider = () =>
    new Paragraph({
      border: { bottom: { color: 'CCCCCC', style: BorderStyle.SINGLE, size: 1 } },
      spacing: { before: 160, after: 160 },
    });

  const emptyLine = () => new Paragraph({ text: '' });

  const listOrEmpty = (items: string[], numbered_: boolean = false) => {
    if (!items?.length) return [body('—')];
    return items.map((item, i) =>
      numbered_ ? numbered(item, i + 1) : bullet(item)
    );
  };

  const children = [
    // ── Cover ────────────────────────────────────────────────────────────────
    new Paragraph({
      children: [
        new TextRun({
          text: `אפיון טכני — ${spec.title || taskTitle}`,
          bold: true,
          size:  36,
          color: '1E40AF',
        }),
      ],
      alignment: AlignmentType.RIGHT,
      ...rtl,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `תאריך: ${today}`, size: 20, color: '6B7280' }),
      ],
      alignment: AlignmentType.RIGHT,
      ...rtl,
      spacing: { after: 400 },
    }),

    // ── Summary ──────────────────────────────────────────────────────────────
    h2('סיכום המשימה'),
    body(spec.summary || '—'),
    divider(),

    // ── Actors ───────────────────────────────────────────────────────────────
    h2('אקטורים ומשתמשים'),
    ...listOrEmpty(spec.actors),
    divider(),

    // ── Trigger ──────────────────────────────────────────────────────────────
    h2('טריגר / נקודת כניסה'),
    body(spec.trigger || '—'),
    divider(),

    // ── Main flow ─────────────────────────────────────────────────────────────
    h2('זרימה ראשית (Happy Path)'),
    ...listOrEmpty(spec.mainFlow, true),

    // ── Alternative flows ─────────────────────────────────────────────────────
    ...(spec.alternativeFlows?.length ? [
      emptyLine(),
      h2('זרימות חלופיות'),
      ...spec.alternativeFlows.flatMap(f => [
        new Paragraph({
          children: [new TextRun({ text: f.name, bold: true, size: 22 })],
          ...rtl, alignment: AlignmentType.RIGHT, spacing: { after: 40 },
        }),
        ...f.steps.map((s, i) => numbered(s, i + 1)),
        emptyLine(),
      ]),
    ] : []),
    divider(),

    // ── Validations ───────────────────────────────────────────────────────────
    h2('ולידציות'),
    ...listOrEmpty(spec.validations),
    divider(),

    // ── Error handling ────────────────────────────────────────────────────────
    h2('טיפול בשגיאות'),
    ...listOrEmpty(spec.errorHandling),
    divider(),

    // ── Edge cases ────────────────────────────────────────────────────────────
    h2('מקרי קצה'),
    ...listOrEmpty(spec.edgeCases),
    divider(),

    // ── Permissions ───────────────────────────────────────────────────────────
    h2('הרשאות'),
    ...listOrEmpty(spec.permissions),
    divider(),

    // ── Integrations ──────────────────────────────────────────────────────────
    h2('אינטגרציות'),
    ...listOrEmpty(spec.integrations),
    divider(),

    // ── Non-functional ────────────────────────────────────────────────────────
    h2('דרישות לא-פונקציונליות'),
    ...listOrEmpty(spec.nonFunctional),

    // ── UI ────────────────────────────────────────────────────────────────────
    ...(spec.uiRequirements?.length ? [
      divider(),
      h2('דרישות UI/UX'),
      ...listOrEmpty(spec.uiRequirements),
    ] : []),

    // ── Open questions ────────────────────────────────────────────────────────
    ...(spec.openQuestions?.length ? [
      divider(),
      h2('שאלות פתוחות'),
      ...listOrEmpty(spec.openQuestions),
    ] : []),
  ];

  return new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: {
          run: { font: 'David', size: 22, rightToLeft: true },
        },
      },
    },
  });
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages, taskTitle, taskDescription } = await req.json();

    // Ask Claude to produce the structured JSON spec
    const response = await client.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        ...messages.map((m: { role: string; content: string }) => ({
          role:    m.role as 'user' | 'assistant',
          content: m.content,
        })),
        {
          role:    'user',
          content: `בהתבסס על כל השיחה שלנו, צור JSON מובנה בפורמט הבא בלבד (ללא טקסט נוסף):
{
  "title": "שם המשימה",
  "summary": "תיאור קצר של המשימה",
  "actors": ["אקטור 1", "אקטור 2"],
  "trigger": "מה מפעיל את התהליך",
  "mainFlow": ["שלב 1", "שלב 2", "שלב 3"],
  "alternativeFlows": [{"name": "שם תרחיש", "steps": ["שלב 1"]}],
  "validations": ["ולידציה 1", "ולידציה 2"],
  "errorHandling": ["שגיאה 1 ← תגובה", "שגיאה 2 ← תגובה"],
  "edgeCases": ["מקרה קצה 1", "מקרה קצה 2"],
  "permissions": ["הרשאה 1", "הרשאה 2"],
  "integrations": ["אינטגרציה 1"],
  "nonFunctional": ["דרישה 1"],
  "uiRequirements": ["UI 1"],
  "openQuestions": ["שאלה פתוחה אם יש"]
}`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const spec: SpecDocument = JSON.parse(jsonMatch[0]);

    // Generate Word document
    const doc  = buildDocx(spec, taskTitle || 'אפיון');
    const buffer = await Packer.toBuffer(doc);
    const filename = encodeURIComponent(`אפיון-${(taskTitle || 'משימה').replace(/\s+/g, '-')}.docx`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (err) {
    console.error('[POST /api/ai/spec/export]', err);
    return NextResponse.json({ error: 'שגיאת ייצוא' }, { status: 500 });
  }
}
