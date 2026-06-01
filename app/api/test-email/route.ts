import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to');
  if (!to) {
    return NextResponse.json({ error: 'Missing ?to=email param' }, { status: 400 });
  }

  const host = process.env.EMAIL_SMTP_HOST;
  const port = parseInt(process.env.EMAIL_SMTP_PORT ?? '587', 10);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  // Debug: show what env vars are loaded (never log the password in production)
  const config = {
    host: host ?? '(not set)',
    port,
    user: user ?? '(not set)',
    passSet: !!pass,
    from: process.env.EMAIL_FROM ?? '(not set)',
    appUrl: process.env.APP_URL ?? '(not set)',
  };

  if (!host || !user || !pass) {
    return NextResponse.json({
      error: 'SMTP not configured — missing env vars',
      config,
    }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { type: 'LOGIN', user, pass },
      tls: {
        rejectUnauthorized: false, // relax for test only
        servername: host,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"PM System Test" <${process.env.EMAIL_FROM ?? user}>`,
      to,
      subject: 'PM System — בדיקת מייל',
      html: '<p dir="rtl">אם קיבלת הודעה זו, שרת המייל עובד תקין ✅</p>',
      text: 'אם קיבלת הודעה זו, שרת המייל עובד תקין',
    });

    return NextResponse.json({ success: true, sentTo: to, config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code    = (err as Record<string, unknown>)?.code;
    const response= (err as Record<string, unknown>)?.response;
    return NextResponse.json({
      error: message,
      code,
      smtpResponse: response,
      config,
    }, { status: 500 });
  }
}
