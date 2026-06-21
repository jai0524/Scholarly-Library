const jwt    = require('jsonwebtoken')
const crypto = require('crypto')
const { validationResult } = require('express-validator')
const User   = require('../models/User')

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
    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ message: 'Email already registered' })

    const user = await User.create({ name, email, password, role: 'user', isEmailVerified: true })
    res.status(201).json({ token: signToken(user._id), user })
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

module.exports = { signup, login, me, updateProfile, sendOtp, changePassword, deactivateAccount }
