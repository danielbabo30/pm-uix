import nodemailer from 'nodemailer';

// ── Transporter (Office 365 / generic SMTP) ───────────────────────────────
function createTransporter() {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = parseInt(process.env.EMAIL_SMTP_PORT ?? '587', 10);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!host || !user || !pass) return null;

  // EMAIL_SMTP_SECURE: true = SSL from the start (port 465), false/unset = STARTTLS (port 587)
  const secure = process.env.EMAIL_SMTP_SECURE === 'true' || port === 465;

  // EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED: false = allow self-signed certs, true/unset = strict
  const rejectUnauthorized = process.env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';

  const isOffice365 = host.includes('office365.com') || host.includes('outlook.com');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,     // enforce STARTTLS when not using SSL
    auth: {
      type: 'LOGIN',         // Office 365 needs explicit LOGIN method
      user,
      pass,
    },
    tls: {
      rejectUnauthorized,
      ...(isOffice365 && { servername: host }),
    },
  });
}

// ── Base URL for task deep-links ───────────────────────────────────────────
function appUrl() {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

// ── HTML email template ────────────────────────────────────────────────────
function taskEmailHtml({
  subject,
  intro,
  taskId,
  taskTitle,
  taskDescription,
  taskLink,
  authorName,
}: {
  subject:         string;
  intro:           string;
  taskId:          string;
  taskTitle:       string;
  taskDescription: string | null;
  taskLink:        string;
  authorName?:     string;
}) {
  const descHtml = taskDescription
    ? `<p style="margin:0 0 16px;color:#374151;line-height:1.6;white-space:pre-wrap;">${escHtml(taskDescription)}</p>`
    : '';

  const authorNote = authorName
    ? `<p style="margin:0 0 16px;font-size:13px;color:#6B7280;">על ידי: <strong>${escHtml(authorName)}</strong></p>`
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:#1E40AF;padding:24px 32px;">
          <p style="margin:0;color:#BFDBFE;font-size:13px;letter-spacing:.5px;">PM System</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">${escHtml(subject)}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;color:#111827;font-size:15px;">${escHtml(intro)}</p>

          <!-- Task card -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:20px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">משימה #${escHtml(taskId)}</p>
              <h2 style="margin:0 0 12px;font-size:17px;color:#111827;">${escHtml(taskTitle)}</h2>
              ${descHtml}
              ${authorNote}
              <a href="${taskLink}"
                style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;
                       font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">
                פתח משימה ←
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            הודעה זו נשלחה אוטומטית ממערכת ניהול הפרויקטים.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Public helpers ─────────────────────────────────────────────────────────

/**
 * Send an email when a task is assigned/re-assigned to a user.
 * toEmail: recipient's email address
 */
export async function sendAssignmentEmail({
  toEmail,
  toName,
  taskId,
  taskTitle,
  taskDescription,
  assignedBy,
}: {
  toEmail:         string;
  toName:          string;
  taskId:          string;
  taskTitle:       string;
  taskDescription: string | null;
  assignedBy?:     string;
}) {
  const transporter = createTransporter();
  if (!transporter) return; // email not configured — skip silently

  const taskLink = `${appUrl()}/?task=${taskId}`;
  const subject  = `שויכת למשימה #${taskId}`;
  const intro    = `שלום ${toName}, שויכת למשימה הבאה:`;

  await transporter.sendMail({
    from:    `"PM System" <${process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER}>`,
    to:      toEmail,
    subject,
    html:    taskEmailHtml({ subject, intro, taskId, taskTitle, taskDescription, taskLink, authorName: assignedBy }),
    text:    `${intro}\n\n#${taskId}: ${taskTitle}\n\n${taskDescription ?? ''}\n\n${taskLink}`,
  });
}

/**
 * Send an email when a user is @mentioned in a comment.
 */
export async function sendMentionEmail({
  toEmail,
  toName,
  taskId,
  taskTitle,
  taskDescription,
  mentionedBy,
  commentBody,
}: {
  toEmail:         string;
  toName:          string;
  taskId:          string;
  taskTitle:       string;
  taskDescription: string | null;
  mentionedBy:     string;
  commentBody:     string;
}) {
  const transporter = createTransporter();
  if (!transporter) return;

  const taskLink = `${appUrl()}/?task=${taskId}`;
  const subject  = `תויגת בתגובה על משימה #${taskId}`;
  const intro    = `שלום ${toName}, ${mentionedBy} תייג אותך בתגובה:`;

  // Append comment snippet to description area
  const commentSnippet = `💬 "${commentBody.slice(0, 200)}${commentBody.length > 200 ? '...' : ''}"`;
  const fullDesc = [commentSnippet, taskDescription ? `\nתיאור משימה:\n${taskDescription}` : ''].join('\n');

  await transporter.sendMail({
    from:    `"PM System" <${process.env.EMAIL_FROM ?? process.env.EMAIL_SMTP_USER}>`,
    to:      toEmail,
    subject,
    html:    taskEmailHtml({ subject, intro, taskId, taskTitle, taskDescription: fullDesc, taskLink, authorName: mentionedBy }),
    text:    `${intro}\n\n${commentSnippet}\n\nמשימה #${taskId}: ${taskTitle}\n${taskLink}`,
  });
}
