import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "CineMind <onboarding@resend.dev>";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const LOGO_URL = `${FRONTEND_URL.replace(/\/$/, "")}/logo.png`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_FILE_PATH = path.resolve(__dirname, "../../frontend/src/assets/logo.png");

const EMBEDDED_LOGO = (() => {
  try {
    const logoBuffer = fs.readFileSync(LOGO_FILE_PATH);
    return `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    return LOGO_URL;
  }
})();

function emailShell({ preheader, title, subtitle, ctaText, ctaUrl, accent = "#2563eb", bodyHtml }) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <div style="background:#020617;padding:36px 12px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#e2e8f0;">
      <div style="max-width:620px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.45);">
        <div style="padding:24px;border-bottom:1px solid #1e293b;background:radial-gradient(120% 140% at 0% 0%, rgba(37,99,235,0.2), transparent), linear-gradient(180deg,#0b1224,#0f172a);">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${EMBEDDED_LOGO}" alt="CineMind" width="36" height="36" style="border-radius:8px;display:block;" />
            <div style="font-size:22px;font-weight:700;letter-spacing:0.2px;color:#f8fafc;">CineMind</div>
          </div>
          <p style="margin:18px 0 6px 0;font-size:24px;line-height:1.25;color:#f8fafc;font-weight:700;">${title}</p>
          <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">${subtitle}</p>
        </div>

        <div style="padding:24px;line-height:1.75;font-size:15px;color:#cbd5e1;">
          ${bodyHtml}

          <div style="margin:24px 0;">
            <a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;background:${accent};border-radius:10px;color:#ffffff;text-decoration:none;font-weight:600;">
              ${ctaText}
            </a>
          </div>

          <div style="margin-top:20px;padding:14px;border:1px solid #334155;border-radius:10px;background:#0b1224;">
            <p style="margin:0 0 8px 0;color:#94a3b8;font-size:13px;">If the button does not work, copy and paste this secure one-time URL:</p>
            <p style="margin:0;word-break:break-all;"><a href="${ctaUrl}" style="color:#60a5fa;text-decoration:none;">${ctaUrl}</a></p>
          </div>
        </div>

        <div style="padding:16px 24px;border-top:1px solid #1e293b;background:#0b1224;color:#64748b;font-size:12px;line-height:1.7;">
          <strong style="color:#94a3b8;">Security notice:</strong> This email was sent by CineMind account security systems. The link above expires automatically and can only be used once. If this wasn't you, you can safely ignore this message.
        </div>
      </div>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  if (!resend) {
    return { success: true, mock: true };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
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
        <p style="margin:0;color:#94a3b8;">For your security, this link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
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
        <p style="margin:0;color:#94a3b8;">This confirmation link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
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
        <p style="margin:0;color:#94a3b8;">This deletion link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      `,
    }),
  });
}
