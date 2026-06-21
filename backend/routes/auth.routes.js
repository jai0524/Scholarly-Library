const router = require('express').Router()
const { body } = require('express-validator')
const {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  login,
  me,
  updateProfile,
  sendOtp,
  changePassword,
  deactivateAccount,
} = require('../controllers/auth.controller')
const { protect } = require('../middleware/auth')

const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]

const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
]

router.post('/signup',             signupRules, signup)
router.post('/verify-signup-otp',             verifySignupOtp)
router.post('/resend-signup-otp',             resendSignupOtp)
router.post('/login',              loginRules,  login)
router.get('/me',          protect,     me)
router.patch('/profile',   protect,     updateProfile)
router.post('/otp',        protect,     sendOtp)
router.patch('/password',  protect,     changePassword)
router.patch('/deactivate',protect,     deactivateAccount)

module.exports = router
