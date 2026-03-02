import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "CineMind <onboarding@resend.dev>";

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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height:1.5;">
        <h2>Confirm your CineMind account</h2>
        <p>Hi ${username},</p>
        <p>Thanks for signing up. Confirm your email to create your account.</p>
        <p>
          <a href="${verifyUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;">
            Confirm account
          </a>
        </p>
        <p>This link expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });
}

export async function sendPasswordChangeConfirmationEmail(email, username, confirmUrl, expiresInMinutes) {
  return sendEmail({
    to: email,
    subject: "Confirm your password change",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height:1.5;">
        <h2>Confirm password change</h2>
        <p>Hi ${username},</p>
        <p>We received a request to change your CineMind password.</p>
        <p>
          <a href="${confirmUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;">
            Confirm password change
          </a>
        </p>
        <p>This link expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });
}

export async function sendAccountDeletionConfirmationEmail(email, username, confirmUrl, expiresInMinutes) {
  return sendEmail({
    to: email,
    subject: "Confirm account deletion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height:1.5;">
        <h2>Confirm account deletion</h2>
        <p>Hi ${username},</p>
        <p>We received a request to permanently delete your CineMind account.</p>
        <p>
          <a href="${confirmUrl}" style="background:#dc2626;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block;">
            Confirm account deletion
          </a>
        </p>
        <p>This link expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });
}
