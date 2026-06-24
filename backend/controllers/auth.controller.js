const jwt    = require('jsonwebtoken')
const crypto = require('crypto')
const { validationResult } = require('express-validator')
const User   = require('../models/User')
const { sendEmail }      = require('../email/sender')
const { signupOtpHtml }  = require('../email/templates/signupOtp')

/* ── helpers ──────────────────────────────────────────── */

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
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

    const { sent, reason } = await sendEmail({
      to:      normalizedEmail,
      subject: 'Scholarly Library — Your verification code',
      text:    `Your signup verification code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not create an account, ignore this email.`,
      html:    signupOtpHtml(code),
    })

    if (!sent && reason !== 'no_smtp') {
      return res.status(500).json({ message: `Email failed: ${reason}` })
    }

    res.status(201).json({ message: 'Verification code sent to your email.' })
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
    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ message: 'Verification code must be 6 digits.' })
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

    const { sent, reason } = await sendEmail({
      to:      user.email,
      subject: 'Scholarly Library — Your verification code',
      text:    `Your signup verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      html:    signupOtpHtml(code),
    })

    if (!sent && reason !== 'no_smtp') {
      return res.status(500).json({ message: 'Could not send verification email. Please try again.' })
    }

    res.json({ message: 'New verification code sent.' })
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
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() + 9 * 60 * 1000)) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting a new code.' })
    }

    const code   = genOtp()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    user.otpCode   = crypto.createHash('sha256').update(code).digest('hex')
    user.otpExpiry = expiry
    await user.save({ validateBeforeSave: false })

    const { sent, reason } = await sendEmail({
      to:      user.email,
      subject: 'Scholarly Library — Your password change code',
      text:    `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      html:    signupOtpHtml(code),
    })

    if (!sent && reason !== 'no_smtp') {
      return res.status(500).json({ message: 'Could not send verification email. Please try again.' })
    }

    res.json({ message: 'Verification code sent to your email.' })
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
