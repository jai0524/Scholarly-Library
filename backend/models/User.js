const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    picture:        { type: String,  default: '' },
    phone:          { type: String,  default: '' },
    department:     { type: String,  default: '' },
    course:         { type: String,  default: '' },
    year:           { type: String,  default: '' },
    bio:            { type: String,  default: '' },
    suspended:      { type: Boolean, default: false },
    isDeactivated:  { type: Boolean, default: false },
    otpCode:         { type: String,  default: null },
    otpExpiry:       { type: Date,    default: null },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 8)
  next()
})

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

// Never return password in JSON responses
userSchema.set('toJSON', {
  transform(_, obj) {
    delete obj.password
    return obj
  },
})

module.exports = mongoose.model('User', userSchema)
