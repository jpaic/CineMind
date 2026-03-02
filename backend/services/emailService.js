import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "CineMind <onboarding@resend.dev>";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL || `${FRONTEND_URL.replace(/\/$/, "")}/logo.png`;


function compactHtml(html) {
  return html
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toPlainText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function emailShell({ preheader, title, subtitle, ctaText, ctaUrl, accent = "#2563eb", bodyHtml }) {
  const logoMarkup = EMAIL_LOGO_URL
    ? `<img src="${EMAIL_LOGO_URL}" alt="CineMind" width="32" height="32" style="display:block;border-radius:6px;" />`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px 12px;color:#1e293b;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:#ffffff;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${logoMarkup}
            <div style="font-size:20px;font-weight:700;color:#0f172a;">CineMind</div>
          </div>
          <p style="display:none;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</p>
          <p style="margin:14px 0 4px 0;font-size:24px;line-height:1.3;color:#0f172a;font-weight:700;">${title}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">${subtitle}</p>
        </div>

        <div style="padding:24px;font-size:15px;line-height:1.7;color:#334155;">
          ${bodyHtml}

          <div style="margin:22px 0;">
            <a href="${ctaUrl}" style="display:inline-block;padding:11px 18px;background:${accent};border-radius:8px;color:#ffffff;text-decoration:none;font-weight:600;">
              ${ctaText}
            </a>
          </div>

          <p style="margin:0 0 8px 0;color:#64748b;font-size:13px;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="margin:0;word-break:break-all;"><a href="${ctaUrl}" style="color:#2563eb;text-decoration:underline;">${ctaUrl}</a></p>
        </div>

        <div style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;">
          Security notice: this link expires automatically and can only be used once. If you did not request this, you can ignore this email.
        </div>
      </div>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  const compactedHtml = compactHtml(html);
  const textBody = toPlainText(compactedHtml);
  if (!resend) {
    return { success: true, mock: true };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: compactedHtml,
      text: textBody,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Email send failed:", error);
    return { success: false, error: error.message };
  }
}

export async function sendSignupVerificationEmail(email, username, verifyUrl, expiresInMinutes) {
  return sendEmail({
    to: email,
    subject: "Confirm your CineMind account",
    html: emailShell({
      preheader: "Confirm your email to finish creating your CineMind account.",
      title: "Confirm your account",
      subtitle: "One quick step left before your account goes live.",
      ctaText: "Confirm account",
      ctaUrl: verifyUrl,
      accent: "#2563eb",
      bodyHtml: `
        <p style="margin:0 0 14px 0;">Hi <strong>${username}</strong>, thanks for joining CineMind.</p>
        <p style="margin:0 0 14px 0;">Please confirm your email address to complete registration and activate your account.</p>
        <p style="margin:0 0 14px 0;">Once verified, you'll be able to manage your watchlist, ratings, and account preferences securely.</p>
        <p style="margin:0;color:#475569;">For your security, this link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      `,
    }),
  });
}

export async function sendPasswordChangeConfirmationEmail(email, username, confirmUrl, expiresInMinutes) {
  return sendEmail({
    to: email,
    subject: "Confirm your password change",
    html: emailShell({
      preheader: "A password change was requested on your CineMind account.",
      title: "Approve password change",
      subtitle: "Confirm this action to finalize your new password.",
      ctaText: "Confirm password change",
      ctaUrl: confirmUrl,
      accent: "#2563eb",
      bodyHtml: `
        <p style="margin:0 0 14px 0;">Hi <strong>${username}</strong>, we received a request to change your password.</p>
        <p style="margin:0 0 14px 0;">If this was you, confirm it below to finalize the change. If not, ignore this email and your current password will remain active.</p>
        <p style="margin:0 0 14px 0;">We recommend reviewing your recent account activity if you did not initiate this request.</p>
        <p style="margin:0;color:#475569;">This confirmation link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      `,
    }),
  });
}

export async function sendAccountDeletionConfirmationEmail(email, username, confirmUrl, expiresInMinutes) {
  return sendEmail({
    to: email,
    subject: "Confirm account deletion",
    html: emailShell({
      preheader: "An account deletion request was made for your CineMind account.",
      title: "Confirm account deletion",
      subtitle: "This action permanently removes your account and data.",
      ctaText: "Delete my account",
      ctaUrl: confirmUrl,
      accent: "#dc2626",
      bodyHtml: `
        <p style="margin:0 0 14px 0;">Hi <strong>${username}</strong>, we received a request to permanently delete your CineMind account.</p>
        <p style="margin:0 0 14px 0;">If this was you, confirm deletion below. This action permanently removes your profile, ratings, watchlist, and settings.</p>
        <p style="margin:0 0 14px 0;">If you did not request this, ignore this email and your account will remain unchanged.</p>
        <p style="margin:0;color:#475569;">This deletion link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      `,
    }),
  });
}
