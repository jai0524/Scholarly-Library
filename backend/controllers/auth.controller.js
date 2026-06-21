const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const nodemailer = require('nodemailer')
const { validationResult } = require('express-validator')
const User     = require('../models/User')

/* ── helpers ──────────────────────────────────────────── */

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function signupOtpEmailHtml(code) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;max-width:520px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e1a14 0%,#2a2218 100%);padding:32px 40px;text-align:center;border-bottom:1px solid #2a2a2a;">
            <div style="font-size:28px;margin-bottom:8px;">📚</div>
            <h1 style="margin:0;color:#e9c176;font-size:22px;font-weight:700;letter-spacing:0.5px;">Scholarly Library</h1>
            <p style="margin:6px 0 0;color:#8a7a60;font-size:13px;">Email Verification</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#c8c0b0;font-size:15px;line-height:1.6;">
              Use the code below to verify your email and complete your registration. It expires in <strong style="color:#e9c176;">10 minutes</strong>.
            </p>
            <div style="background:#111;border:1px solid #3a3020;border-radius:12px;padding:28px;text-align:center;margin:24px 0;">
              <p style="margin:0 0 8px;color:#8a7a60;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>
              <div style="font-size:42px;font-weight:700;letter-spacing:14px;color:#e9c176;font-family:'Courier New',monospace;">${code}</div>
            </div>
            <p style="margin:0;color:#6a6a6a;font-size:13px;line-height:1.6;">
              If you did not create an account, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#111;padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
            <p style="margin:0;color:#4a4a4a;font-size:12px;">© Scholarly Library · This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[EMAIL] No SMTP configured — skipped for ${to}`)
    return
  }
  try {
    const transporter = nodemailer.createTransport({
      host:              process.env.SMTP_HOST,
      port:              Number(process.env.SMTP_PORT) || 587,
      secure:            process.env.SMTP_SECURE === 'true',
      auth:              { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      family:            4,
      connectionTimeout: 10000,
      greetingTimeout:   10000,
      socketTimeout:     15000,
    })
    await transporter.sendMail({ from: `"Scholarly Library" <${process.env.SMTP_USER}>`, to, subject, text, html })
    console.log(`[EMAIL] Sent to ${to} — "${subject}"`)
  } catch (err) {
    console.error(`[EMAIL] Failed to ${to} — ${err.message}`)
  }
}

/* ── POST /api/auth/signup ──────────────────────────── */
async function signup(req, res, next) {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { name, email, password } = req.body
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await User.findOne({ email: normalizedEmail })
    if (existing?.isEmailVerified) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    let user
    if (existing && !existing.isEmailVerified) {
      // Update details and resend OTP for existing unverified account
      existing.name     = name.trim()
      existing.password = password
      user = existing
    } else {
      user = new User({ name: name.trim(), email: normalizedEmail, password, role: 'user', isEmailVerified: false })
    }

    const code     = genOtp()
    user.otpCode   = crypto.createHash('sha256').update(code).digest('hex')
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000)
    await user.save()

    res.status(201).json({ message: 'Verification code sent to your email.' })
    setImmediate(() => sendEmail({
      to:      normalizedEmail,
      subject: 'Scholarly Library — Your verification code',
      text:    `Your signup verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not create an account, ignore this email.`,
      html:    signupOtpEmailHtml(code),
    }))
  } catch (err) {
    next(err)
  }
}

/* ── POST /api/auth/verify-signup-otp ───────────────── */
async function verifySignupOtp(req, res, next) {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required.' })
    }

    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: false })
    if (!user) {
      return res.status(400).json({ message: 'No pending verification found for this email.' })
    }

    const hashedOtp = crypto.createHash('sha256').update(String(otp)).digest('hex')
    if (!user.otpCode || user.otpCode !== hashedOtp) {
      return res.status(400).json({ message: 'Invalid verification code.' })
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' })
    }

    user.isEmailVerified = true
    user.otpCode         = null
    user.otpExpiry       = null
    await user.save({ validateBeforeSave: false })

    res.json({ token: signToken(user._id), user })
  } catch (err) {
    next(err)
  }
}

/* ── POST /api/auth/resend-signup-otp ───────────────── */
async function resendSignupOtp(req, res, next) {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: false })
    if (!user) {
      return res.status(400).json({ message: 'No pending verification found for this email.' })
    }

    // 60-second cooldown: expiry > now + 9min means it was just sent
    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() + 9 * 60 * 1000)) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' })
    }

    const code     = genOtp()
    user.otpCode   = crypto.createHash('sha256').update(code).digest('hex')
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000)
    await user.save({ validateBeforeSave: false })

    res.json({ message: 'New verification code sent.' })
    setImmediate(() => sendEmail({
      to:      user.email,
      subject: 'Scholarly Library — Your verification code',
      text:    `Your signup verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      html:    signupOtpEmailHtml(code),
    }))
  } catch (err) {
    next(err)
  }
}

/* ── POST /api/auth/login ──────────────────────────── */
async function login(req, res, next) {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.', code: 'EMAIL_NOT_VERIFIED' })
    }
    if (user.suspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact the library.' })
    }
    if (user.isDeactivated) {
      return res.status(403).json({ message: 'This account has been deactivated. Contact the library to restore it.' })
    }
    res.json({ token: signToken(user._id), user })
  } catch (err) {
    next(err)
  }
}

/* ── GET /api/auth/me ──────────────────────────────── */
async function me(req, res, next) {
  try {
    res.json(req.user)
  } catch (err) {
    next(err)
  }
}

/* ── PATCH /api/auth/profile ───────────────────────── */
async function updateProfile(req, res, next) {
  try {
    const { name, picture, phone, department, course, year, bio } = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, picture, phone, department, course, year, bio },
      { new: true, runValidators: true }
    )
    res.json(user)
  } catch (err) {
    next(err)
  }
}

/* ── POST /api/auth/otp  (generate OTP for password change) ─ */
async function sendOtp(req, res, next) {
  try {
    const user = await User.findById(req.user._id)

    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() + 9 * 60 * 1000)) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' })
    }

    const code   = genOtp()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    user.otpCode   = crypto.createHash('sha256').update(code).digest('hex')
    user.otpExpiry = expiry
    await user.save({ validateBeforeSave: false })

    res.json({ message: 'Verification code generated.', otp: code })
  } catch (err) {
    next(err)
  }
}

/* ── PATCH /api/auth/password  (verify OTP + set new pw) */
async function changePassword(req, res, next) {
  try {
    const { otp, newPassword } = req.body
    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required.' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const user = await User.findById(req.user._id)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex')

    if (!user.otpCode || user.otpCode !== hashedOtp) {
      return res.status(400).json({ message: 'Invalid verification code.' })
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' })
    }

    user.password  = newPassword
    user.otpCode   = null
    user.otpExpiry = null
    await user.save()

    res.json({ message: 'Password updated successfully.' })
  } catch (err) {
    next(err)
  }
}

/* ── PATCH /api/auth/deactivate ────────────────────── */
async function deactivateAccount(req, res, next) {
  try {
    const { confirmEmail } = req.body
    const user = await User.findById(req.user._id)

    if (!confirmEmail || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ message: 'Email confirmation does not match your account email.' })
    }

    user.isDeactivated = true
    await user.save({ validateBeforeSave: false })

    res.json({ message: 'Account deactivated. You have been logged out.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { signup, verifySignupOtp, resendSignupOtp, login, me, updateProfile, sendOtp, changePassword, deactivateAccount }
