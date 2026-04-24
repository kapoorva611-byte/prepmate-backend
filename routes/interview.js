const express = require('express')
const router = express.Router()
const { GoogleGenerativeAI } = require('@google/generative-ai')
const authMiddleware = require('../middleware/auth')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

router.post('/generate-questions', async (req, res) => {
  try {
    const { role, difficulty } = req.body

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `Generate 5 technical interview questions for a ${difficulty} level ${role} developer position. 
    Format the response as a JSON array like this:
    [
      {
        "id": 1,
        "question": "question here",
        "topic": "topic here"
      }
    ]
    Only return the JSON array, nothing else.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const questions = JSON.parse(cleanedText)
    res.json({ questions })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error generating questions', error: error.message })
  }
})
router.post('/evaluate-answer', async (req, res) => {
  try {
    const { question, answer, role } = req.body

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `You are an expert technical interviewer for a ${role} position.
    
Question asked: ${question}

Candidate's answer: ${answer}

Evaluate this answer and respond ONLY with a JSON object in this exact format:
{
  "score": <number between 1-10>,
  "verdict": "<Excellent/Good/Average/Poor>",
  "whatWasGood": "<one sentence about what was good>",
  "whatWasMissing": "<one sentence about what was missing>",
  "perfectAnswer": "<perfect answer in maximum 3 bullet points, each under 15 words>",
  "tips": "<one specific actionable tip under 15 words>",
  "missingKeywords": "<comma separated list of 3-5 keywords that were missing from the answer>"
}
Only return the JSON object, nothing else.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const evaluation = JSON.parse(cleanedText)

    res.json({ evaluation })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error evaluating answer', error: error.message })
  }
})
const Interview = require('../models/Interview')

// Start new interview session
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { role, difficulty } = req.body
    const userId = req.userId

    const interview = new Interview({
      userId,
      role,
      difficulty,
      questions: []
    })

    await interview.save()
    res.status(201).json({
      message: 'Interview started',
      interviewId: interview._id
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Save question + answer + evaluation
router.post('/save-question', authMiddleware, async (req, res) => {
  try {
    const { interviewId, question, topic, userAnswer, evaluation } = req.body

    const interview = await Interview.findById(interviewId)
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }

    interview.questions.push({
      question,
      topic,
      userAnswer,
      score: evaluation.score,
      verdict: evaluation.verdict,
      whatWasGood: evaluation.whatWasGood,
      whatWasMissing: evaluation.whatWasMissing,
      perfectAnswer: evaluation.perfectAnswer,
      tips: evaluation.tips,
      missingKeywords: evaluation.missingKeywords
    })
    await interview.save()
    res.json({ message: 'Question saved successfully' })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Complete interview and calculate overall score
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { interviewId } = req.body

    const interview = await Interview.findById(interviewId)
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }

    // Calculate overall score
    const totalScore = interview.questions.reduce((sum, q) => sum + q.score, 0)
    const overallScore = Math.round(totalScore / interview.questions.length)

    interview.overallScore = overallScore
    interview.status = 'completed'

    await interview.save()
    res.json({
      message: 'Interview completed',
      overallScore,
      totalQuestions: interview.questions.length
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// Get interview history for a user
router.get('/history/:userId', authMiddleware, async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.params.userId,
      status: 'completed'
    }).sort({ createdAt: -1 })

    res.json({ interviews })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})


module.exports = router