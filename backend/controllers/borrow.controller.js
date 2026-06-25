const BorrowRequest = require('../models/BorrowRequest')
const Material = require('../models/Material')
const Activity = require('../models/Activity')
const User = require('../models/User')

// POST /api/borrow  — user requests a material
async function requestBorrow(req, res, next) {
  try {
    const { materialId } = req.body
    const material = await Material.findById(materialId)
    if (!material) return res.status(404).json({ message: 'Material not found' })

    const existing = await BorrowRequest.findOne({
      user: req.user._id,
      material: materialId,
      status: { $in: ['pending', 'approved'] },
    })
    if (existing) return res.status(409).json({ message: 'Already requested or borrowed' })

    const request = await BorrowRequest.create({ user: req.user._id, material: materialId })

    await Activity.create({
      user: req.user._id,
      kind: 'borrow',
      title: material.availableCopies < 1 ? 'Added to Waitlist' : 'Borrow Requested',
      detail: material.title,
      material: material._id,
      icon: material.availableCopies < 1 ? 'hourglass_empty' : 'local_library',
      iconBg: 'bg-secondary-container',
      iconColor: 'text-on-secondary-container',
    })

    res.status(201).json(request)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/borrow/:id/cancel  — user cancels their request
// FIX: restores copy when cancelling an already-approved borrow
async function cancelRequest(req, res, next) {
  try {
    const request = await BorrowRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('material')

    if (!request) return res.status(404).json({ message: 'Request not found' })
    if (!['pending', 'approved'].includes(request.status)) {
      return res.status(400).json({ message: 'Cannot cancel this request' })
    }

    const wasApproved = request.status === 'approved'
    request.status = 'cancelled'
    await request.save()

    // Restore the copy that was consumed when the borrow was approved
    if (wasApproved) {
      await Material.findByIdAndUpdate(request.material._id, { $inc: { availableCopies: 1 } })
    }

    await Activity.create({
      user: req.user._id,
      kind: 'cancel',
      title: 'Request Cancelled',
      detail: request.material?.title ?? '',
      material: request.material?._id,
      icon: 'cancel',
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container',
    })

    res.json(request)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/borrow/:id/return  — user returns a borrowed material
async function returnMaterial(req, res, next) {
  try {
    const request = await BorrowRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: 'approved',
    }).populate('material')

    if (!request) return res.status(404).json({ message: 'Borrow record not found' })

    request.status = 'returned'
    request.returnedAt = new Date()
    await request.save()

    await Material.findByIdAndUpdate(request.material._id, { $inc: { availableCopies: 1 } })

    await Activity.create({
      user: req.user._id,
      kind: 'return',
      title: 'Return Confirmed',
      detail: request.material?.title ?? '',
      material: request.material?._id,
      icon: 'assignment_return',
      iconBg: 'bg-tertiary-container',
      iconColor: 'text-on-tertiary-container',
    })

    res.json(request)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/borrow/:id/renew  — user renews a borrowed material
async function renewMaterial(req, res, next) {
  try {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    // Atomic: only succeeds if renewCount < 2, preventing race conditions
    const request = await BorrowRequest.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'approved', renewCount: { $lt: 2 } },
      { $inc: { renewCount: 1 }, dueDate },
      { new: true }
    ).populate('material')

    if (!request) {
      const exists = await BorrowRequest.findOne({ _id: req.params.id, user: req.user._id })
      if (!exists) return res.status(404).json({ message: 'Borrow record not found' })
      return res.status(400).json({ message: 'Maximum renewals reached' })
    }

    await Activity.create({
      user: req.user._id,
      kind: 'renew',
      title: 'Renewal Requested',
      detail: request.material?.title ?? '',
      material: request.material?._id,
      icon: 'autorenew',
      iconBg: 'bg-secondary-container',
      iconColor: 'text-on-secondary-container',
    })

    res.json(request)
  } catch (err) {
    next(err)
  }
}

// GET /api/borrow/my  — current user's borrow history (optional ?materialId=)
async function myRequests(req, res, next) {
  try {
    const filter = { user: req.user._id }
    if (req.query.materialId) filter.material = req.query.materialId
    const requests = await BorrowRequest.find(filter)
      .populate('material', 'title author kind coverUrl')
      .sort({ createdAt: -1 })
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

// GET /api/borrow  — admin: all requests with full detail
async function allRequests(req, res, next) {
  try {
    const { status, page = 1, limit = 20, materialId, q } = req.query
    const filter = {}
    if (status) filter.status = status
    if (materialId) filter.material = materialId
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const [matchingUsers, matchingMaterials] = await Promise.all([
        User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id'),
        Material.find({ title: regex }).select('_id'),
      ])
      const userIds = matchingUsers.map((u) => u._id)
      const matIds = matchingMaterials.map((m) => m._id)
      if (userIds.length === 0 && matIds.length === 0) {
        return res.json({ requests: [], total: 0, page: Number(page), pages: 0 })
      }
      filter.$or = [
        ...(userIds.length ? [{ user: { $in: userIds } }] : []),
        ...(matIds.length ? [{ material: { $in: matIds } }] : []),
      ]
    }
    const [requests, total] = await Promise.all([
      BorrowRequest.find(filter)
        .populate('user', 'name email')
        .populate('material', 'title author kind')
        .populate('processedBy', 'name email role')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      BorrowRequest.countDocuments(filter),
    ])
    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/borrow/:id/approve  — admin approves (atomic to prevent double-decrement)
async function approveRequest(req, res, next) {
  try {
    // Atomically flip pending→approved to prevent race condition
    const request = await BorrowRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'approved', approvedAt: new Date(), processedBy: req.user._id, processedAt: new Date() },
      { new: true }
    ).populate('material user')

    if (!request) return res.status(400).json({ message: 'Request not found or already processed' })

    // Atomically decrement only if copies are available
    const updated = await Material.findOneAndUpdate(
      { _id: request.material._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } }
    )

    if (!updated) {
      // Roll back — no copies 
      await BorrowRequest.findByIdAndUpdate(request._id, {
        status: 'pending', approvedAt: null, processedBy: null, processedAt: null,
      })
      return res.status(400).json({ message: 'No copies available' })
    }

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
    await BorrowRequest.findByIdAndUpdate(request._id, { dueDate })

    await Activity.create({
      user: request.user._id,
      kind: 'borrow',
      title: 'Borrow Approved',
      detail: `${request.material.title} — due ${dueDate.toLocaleDateString()}`,
      material: request.material._id,
      icon: 'check_circle',
      iconBg: 'bg-tertiary-container',
      iconColor: 'text-on-tertiary-container',
    })

    res.json({ ...request.toObject(), dueDate })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/borrow/:id/reject  — admin rejects a pending request
async function rejectRequest(req, res, next) {
  try {
    const request = await BorrowRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { status: 'rejected', processedBy: req.user._id, processedAt: new Date() },
      { new: true }
    ).populate('material user')

    if (!request) return res.status(400).json({ message: 'Request not found or already processed' })

    await Activity.create({
      user: request.user._id,
      kind: 'alert',
      title: 'Borrow Request Rejected',
      detail: request.material?.title ?? '',
      material: request.material?._id,
      icon: 'cancel',
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container',
    })

    res.json(request)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/borrow/:id/override  — superadmin overrides an already-processed request
async function overrideRequest(req, res, next) {
  try {
    const { action } = req.body // 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be approve or reject' })
    }

    const request = await BorrowRequest.findById(req.params.id).populate('material user')
    if (!request) return res.status(404).json({ message: 'Request not found' })
    if (!['approved', 'rejected'].includes(request.status)) {
      return res.status(400).json({ message: 'Can only override approved or rejected requests' })
    }

    const prevStatus = request.status

    if (action === 'reject' && prevStatus === 'approved') {
      // Undo approval — restore copy
      request.status = 'rejected'
      request.processedBy = req.user._id
      request.processedAt = new Date()
      request.dueDate = null
      await request.save()
      await Material.findByIdAndUpdate(request.material._id, { $inc: { availableCopies: 1 } })

      await Activity.create({
        user: request.user._id,
        kind: 'alert',
        title: 'Borrow Overridden: Rejected',
        detail: request.material?.title ?? '',
        material: request.material?._id,
        icon: 'cancel',
        iconBg: 'bg-error-container',
        iconColor: 'text-on-error-container',
      })
    } else if (action === 'approve' && prevStatus === 'rejected') {
      // Override rejection — consume copy if available
      const updated = await Material.findOneAndUpdate(
        { _id: request.material._id, availableCopies: { $gt: 0 } },
        { $inc: { availableCopies: -1 } }
      )
      if (!updated) return res.status(400).json({ message: 'No copies available to override-approve' })

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)
      request.status = 'approved'
      request.approvedAt = new Date()
      request.dueDate = dueDate
      request.processedBy = req.user._id
      request.processedAt = new Date()
      await request.save()

      await Activity.create({
        user: request.user._id,
        kind: 'borrow',
        title: 'Borrow Override: Approved',
        detail: `${request.material?.title} — due ${dueDate.toLocaleDateString()}`,
        material: request.material?._id,
        icon: 'check_circle',
        iconBg: 'bg-tertiary-container',
        iconColor: 'text-on-tertiary-container',
      })
    } else {
      return res.status(400).json({ message: 'No change needed' })
    }

    res.json(request)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  requestBorrow,
  cancelRequest,
  returnMaterial,
  renewMaterial,
  myRequests,
  allRequests,
  approveRequest,
  rejectRequest,
  overrideRequest,
}
