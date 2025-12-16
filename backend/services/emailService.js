import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email, username) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: true, mock: true };
    }

    const data = await resend.emails.send({
      from: "CineMind <onboarding@resend.dev>",
      to: [email],
      subject: 'Welcome to CineMind! 🎬',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to CineMind, ${username}! 🎬</h1>
          <p>Thank you for joining CineMind, your personal movie recommendation platform.</p>
          <p>Here's what you can do:</p>
          <ul>
            <li>Discover personalized movie recommendations</li>
            <li>Rate movies you've watched</li>
            <li>Check out your movie stats</li>
            <li>Get AI-powered suggestions</li>
          </ul>
          <p>Start exploring movies now!</p>
          <a href="${process.env.FRONTEND_URL}/home" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
            Go to CineMind
          </a>
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            This is a demo project. Please use test data only.
          </p>
        </div>
      `
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email, resetToken) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: true, mock: true };
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const data = await resend.emails.send({
      from: "CineMind <onboarding@resend.dev>",
      to: [email],
      subject: 'Reset Your CineMind Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Reset Your Password</h1>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
            Reset Password
          </a>
          <p style="margin-top: 20px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 12px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    });

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}