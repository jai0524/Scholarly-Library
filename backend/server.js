require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const connectDB = require('./config/db')

const authRoutes     = require('./routes/auth.routes')
const materialRoutes = require('./routes/material.routes')
const borrowRoutes   = require('./routes/borrow.routes')
const userRoutes     = require('./routes/user.routes')
const activityRoutes = require('./routes/activity.routes')
const uploadRoutes   = require('./routes/upload.routes')
const savedRoutes    = require('./routes/saved.routes')

const app = express()

// CORS — strip trailing slashes so exact-match never fails
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000']
  .filter(Boolean)
  .map(o => o.replace(/\/$/, ''))

app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth',      authRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/borrow',    borrowRoutes)
app.use('/api/users',     userRoutes)
app.use('/api/activity',  activityRoutes)
app.use('/api/upload',    uploadRoutes)
app.use('/api/saved',     savedRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(err.status ?? 500).json({ message: err.message ?? 'Internal server error' })
})

async function start() {
  // Fail fast with a clear message if critical env vars are missing
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter(k => !process.env[k])
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  if (!process.env.CLIENT_URL) {
    console.warn('WARNING: CLIENT_URL not set — CORS allows localhost only')
  }

  // Connect to DB first, then open the port
  await connectDB()

  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start().catch(err => {
  console.error('Server failed to start:', err.message)
  process.exit(1)
})
