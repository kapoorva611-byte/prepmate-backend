const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const interviewRoutes = require('./routes/interview')

const app = express()

app.use(cors())
app.use(express.json())

const morgan = require('morgan')
app.use(morgan('dev'))

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.log("MongoDB connection error:", err))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/interview', interviewRoutes)

app.get('/test', (req, res) => {
  res.json({ message: "Backend is working!" })
})

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})