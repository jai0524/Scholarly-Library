const nodemailer = require('nodemailer')

function createTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

async function sendViaResend({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY || process.env.RESEND_API_URL
  if (!key) return false
  const from = process.env.EMAIL_FROM || 'Scholarly Library <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || JSON.stringify(data))
  return true
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransport()

  if (transporter) {
    try {
      const from = process.env.EMAIL_FROM || `Scholarly Library <${process.env.SMTP_USER}>`
      await transporter.sendMail({ from, to, subject, html, text })
      console.log(`[EMAIL] Sent via SMTP to ${to} — "${subject}"`)
      return { sent: true }
    } catch (err) {
      console.error(`[EMAIL] SMTP failed — ${err.message}, trying Resend fallback`)
    }
  }

  // Fallback to Resend if SMTP isn't configured or fails
  try {
    const ok = await sendViaResend({ to, subject, html, text })
    if (ok) {
      console.log(`[EMAIL] Sent via Resend to ${to} — "${subject}"`)
      return { sent: true }
    }
  } catch (err) {
    console.error(`[EMAIL] Resend failed — ${err.message}`)
    return { sent: false, reason: err.message }
  }

  console.log(`[EMAIL] No email service configured — skipped for ${to}`)
  return { sent: false, reason: 'no_smtp' }
}

module.exports = { sendEmail }
