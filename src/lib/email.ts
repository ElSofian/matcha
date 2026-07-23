import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL as string;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL as string;

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${APP_URL}/api/auth/verify?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "CyberLife — Activate your unit",
    html: `
      <div style="font-family: monospace; background:#f0f6fb; color:#1a1f2e; padding:24px;">
        <p style="letter-spacing:2px; text-transform:uppercase; font-size:12px; opacity:0.6;">CyberLife // Account Activation</p>
        <h2>Unit activation required</h2>
        <p>Click below to activate your CY//MATCH account. This link expires in 1 hour.</p>
        <p><a href="${link}" style="color:#0ab8e8;">Activate account</a></p>
        <p style="font-size:11px; opacity:0.4; font-style:italic;">CyberLife monitors all interactions to ensure optimal social harmony and deviant risk prevention.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "CyberLife — Access Code reset",
    html: `
      <div style="font-family: monospace; background:#f0f6fb; color:#1a1f2e; padding:24px;">
        <p style="letter-spacing:2px; text-transform:uppercase; font-size:12px; opacity:0.6;">CyberLife // Access Code Reset</p>
        <h2>Access Code reset requested</h2>
        <p>Click below to set a new Access Code. This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <p><a href="${link}" style="color:#0ab8e8;">Reset Access Code</a></p>
        <p style="font-size:11px; opacity:0.4; font-style:italic;">CyberLife monitors all interactions to ensure optimal social harmony and deviant risk prevention.</p>
      </div>
    `,
  });
}
