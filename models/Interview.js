const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  question: String,
  topic: String,
  userAnswer: String,
  score: Number,
  verdict: String,
  whatWasGood: String,
  whatWasMissing: String,
  perfectAnswer: String,
  tips: String,
  missingKeywords: String
})

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true
  },
  questions: [questionSchema],
  overallScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  }
}, { timestamps: true })

module.exports = mongoose.model('Interview', interviewSchema)