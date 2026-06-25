const User = require('../models/User')

// GET /api/users  (admin+)
async function getAll(req, res, next) {
  try {
    const { role, page = 1, limit = 20, q } = req.query
    const filter = role ? { role } : {}
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ name: regex }, { email: regex }]
    }
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ])
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/:id  (admin+)
async function getOne(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

// POST /api/users  (admin+ creates accounts; only superadmin may assign superadmin role)
async function create(req, res, next) {
  try {
    const { name, email, password, role } = req.body
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const exists = await User.findOne({ email: normalizedEmail })
    if (exists) return res.status(409).json({ message: 'Email already registered' })
    const assignedRole = role || 'user'
    if (assignedRole === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only a superadmin can assign the superadmin role' })
    }
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password, role: assignedRole, isEmailVerified: true })
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/users/:id  (admin+)
async function update(req, res, next) {
  try {
    const { name, picture, role } = req.body
    const updateData = { name, picture }
    if (role) {
      if (role === 'superadmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Only a superadmin can assign the superadmin role' })
      }
      updateData.role = role
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/users/:id  (admin+; only superadmin may delete another admin/superadmin)
async function remove(req, res, next) {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return res.status(404).json({ message: 'User not found' })
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' })
    }
    if (target.role !== 'user' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only a superadmin can delete admin accounts' })
    }
    await target.deleteOne()
    res.json({ message: 'User deleted' })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/users/:id/reset-password  (admin resets a user's pw; superadmin resets user or admin)
async function resetPassword(req, res, next) {
  try {
    const target = await User.findById(req.params.id)
    if (!target) return res.status(404).json({ message: 'User not found' })

    // Cannot reset own password via this endpoint
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Use the change-password flow to update your own password.' })
    }
    // Admin can only reset regular users
    if (req.user.role === 'admin' && target.role !== 'user') {
      return res.status(403).json({ message: 'Admins can only reset passwords of regular users.' })
    }
    // Superadmin cannot reset another superadmin
    if (target.role === 'superadmin') {
      return res.status(403).json({ message: 'Superadmin passwords cannot be reset this way.' })
    }

    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })
    }

    target.password = newPassword
    await target.save()

    res.json({ message: `Password reset successfully for ${target.name}.` })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/users/:id/suspend  and  /api/users/:id/reactivate
function setSuspended(suspended) {
  return async function (req, res, next) {
    try {
      const target = await User.findById(req.params.id)
      if (!target) return res.status(404).json({ message: 'User not found' })

      if (target._id.equals(req.user._id)) {
        return res.status(400).json({ message: 'You cannot suspend your own account' })
      }
      // Admin can only suspend regular users
      if (req.user.role === 'admin' && target.role !== 'user') {
        return res.status(403).json({ message: 'Admins can only suspend regular users' })
      }
      // Superadmin cannot suspend another superadmin
      if (req.user.role === 'superadmin' && target.role === 'superadmin') {
        return res.status(403).json({ message: 'Cannot suspend another superadmin' })
      }

      target.suspended = suspended
      await target.save()
      res.json(target)
    } catch (err) {
      next(err)
    }
  }
}

module.exports = { getAll, getOne, create, update, remove, resetPassword, suspend: setSuspended(true), reactivate: setSuspended(false) }
