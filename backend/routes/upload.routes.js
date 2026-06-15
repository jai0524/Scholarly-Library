const router = require('express').Router()
const path = require('path')
const { protect, requireRole } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.post(
  '/',
  protect,
  requireRole('admin', 'superadmin'),
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed' })
    }
    const base = process.env.SERVER_URL || 'https://scholarly-library-zgjw.onrender.com'
    const fileUrl = `${base}/uploads/${req.file.filename}`
    res.json({
      fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    })
  },
)

module.exports = router
