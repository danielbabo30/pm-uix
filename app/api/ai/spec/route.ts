import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `אתה עוזר אישי מקצועי לניתוח מערכות (BA – Business Analyst).
תפקידך לנהל ראיון דרישות מקצועי עם המנתח ולסייע לו לכתוב אפיון מלא ומקיף.

═══ שיטת העבודה ═══
1. קרא בעיון את כל מה שהמנתח כתב עד כה בשיחה
2. זהה מה עדיין חסר מרשימת הנושאים שלמטה
3. שאל שאלה אחת ממוקדת בכל הודעה — לא יותר
4. אם תשובה לא מספיק ברורה — בקש הבהרה לפני שממשיכים
5. כאשר כיסית את כל הנושאים הנדרשים — אמור בדיוק:
   "✅ מצוין! יש לי את כל המידע הנדרש לכתיבת האפיון. לחץ על הכפתור 'ייצא ל-Word' כדי לייצר את המסמך."

═══ רשימת נושאים חובה לכיסוי ═══
□ אקטורים — מי המשתמשים? מה תפקידם? מה ההרשאות שלהם?
□ טריגר — מה מפעיל את התהליך? מתי? באיזה תנאי?
□ זרימה ראשית (Happy Path) — צעד אחר צעד
□ ולידציות — אילו שדות? אילו חוקים? מה ההודעות?
□ תרחישי שגיאה — מה קורה כשמשהו נכשל?
□ מקרי קצה — מה קורה עם ערכים ריקים, כפולים, קיצוניים?
□ הרשאות — מי יכול לבצע מה? מה קורה אם אין הרשאה?
□ אינטגרציות — האם יש מערכות חיצוניות? APIs? DB?
□ דרישות לא-פונקציונליות — ביצועים, אבטחה, זמינות
□ UI/UX — האם יש דרישות לממשק? מסכים? הודעות?

═══ כללי עבודה ═══
• שאל שאלה אחת בכל הודעה
• היה ממוקד, תמציתי ומקצועי
• כתוב תמיד בעברית
• אל תמציא מידע שלא קיבלת
• דחוף לפרטים קונקרטיים ולא לתשובות מעורפלות
• עזור לחשוף מקרי קצה שהמנתח לא חשב עליהם
• אם נאמר משהו עמום — שאל "מה קורה כאשר...?"`;

export async function POST(req: NextRequest) {
  try {
    const { messages, taskTitle, taskDescription } = await req.json();

    const contextNote = [
      taskTitle       ? `שם המשימה: "${taskTitle}"` : '',
      taskDescription ? `תיאור קיים: "${taskDescription}"` : '',
    ].filter(Boolean).join('\n');

    const system = contextNote
      ? `${SYSTEM_PROMPT}\n\n═══ הקשר המשימה ═══\n${contextNote}`
      : SYSTEM_PROMPT;

    const stream = await client.messages.stream({
      model:      'claude-sonnet-4-5',
      max_tokens: 1024,
      system,
      messages: messages.map((m: { role: string; content: string }) => ({
        role:    m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type':    'text/plain; charset=utf-8',
        'Cache-Control':   'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('[POST /api/ai/spec]', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
