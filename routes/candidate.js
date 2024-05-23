const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { Candidate } = require('../models');
const {sendEvaluationEmail} = require('../routes/nodemailer')
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const candidateRouter = express.Router();

candidateRouter.use(bodyParser.json());
candidateRouter.use(bodyParser.urlencoded({ extended: true }));

/**
 * @swagger
 * /candidate/submitDetails:
 *   post:
 *     summary: Submit candidate details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               idNumber:
 *                 type: string
 *               email:
 *                 type: string
 *             required:
 *               - fullName
 *               - idNumber
 *               - email
 *     responses:
 *       200:
 *         description: Details received
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
candidateRouter.post('/submitDetails', async (req, res) => {
  const { fullName, idNumber, email } = req.body;

  if (!fullName || !idNumber || !email) {
    return res.status(400).json({ error: 'Please provide your full name, ID number, and email.' });
  }

  try {
    const candidate = new Candidate({ fullName, idNumber, email });
    await candidate.save();

    res.json({ message: 'Details received. Now, please provide your language proficiencies.', candidateId: candidate._id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /candidate/submitLanguages:
 *   post:
 *     summary: Submit candidate language proficiencies and generate questions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *               languages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     proficiency:
 *                       type: number
 *             required:
 *               - candidateId
 *               - languages
 *     responses:
 *       200:
 *         description: Questions generated
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
candidateRouter.post('/submitLanguages', async (req, res) => {
  const { candidateId, languages } = req.body;

  if (!languages || languages.length < 3) {
    return res.status(400).json({ error: 'Please provide proficiency in at least three languages.' });
  }

  try {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const questions = [];
    for (const language of languages) {
      const { name, proficiency } = language;
      let knowledgeLevel = '';
      if (proficiency >= 8) knowledgeLevel = 'expert';
      else if (proficiency >= 6) knowledgeLevel = 'advanced';
      else knowledgeLevel = 'intermediate';

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `I am proficient in ${name} programming language at a level of ${proficiency}. Could you ask me some questions to test my ${knowledgeLevel} knowledge?`
            }
          ],
          max_tokens: 100,
          temperature: 0.5,
          n: 1,
        });

        if (response.choices && response.choices.length > 0) {
          const candidateMessage = response.choices[0].message.content;

          if (candidateMessage && typeof candidateMessage === 'string') {
            const question = candidateMessage.trim();
            questions.push({ language: name, question });
            candidate.questions.push({ language: name, question });
          } else {
            questions.push({ language: name, question: 'Error generating question' });
          }
        } else {
          questions.push({ language: name, question: 'Error generating question' });
        }

      } catch (error) {
        questions.push({ language: name, question: 'Error generating question' });
      }
    }

    await candidate.save();
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /candidate/submitAnswers:
 *   post:
 *     summary: Submit candidate answers and get evaluation report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     language:
 *                       type: string
 *                     answer:
 *                       type: string
 *             required:
 *               - candidateId
 *               - answers
 *     responses:
 *       200:
 *         description: Evaluation result
 *       400:
 *         description: Validation error
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Internal server error
 */


candidateRouter.post('/submitAnswers', async (req, res) => {
  const { candidateId, answers } = req.body;

  if (!answers || answers.length === 0) {
    return res.status(400).json({ error: 'Please provide answers to the generated questions.' });
  }

  try {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const evaluationResult = await evaluateCandidate(answers);

    // Calculate the score
    const correctAnswers = evaluationResult.filter(result => result.isRelevant).length;
    const totalQuestions = evaluationResult.length;
    const hasPassed = correctAnswers > totalQuestions / 2;

    candidate.answers = evaluationResult;
    await candidate.save();

    // Send evaluation email
    sendEvaluationEmail(candidate.email, evaluationResult, hasPassed);

    res.json({ evaluationResult, hasPassed });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


async function evaluateCandidate(candidateAnswers) {
  const evaluationResult = [];

  for (const answer of candidateAnswers) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Evaluate the following answer and determine if it is relevant: ${answer.answer}`
          }
        ],
        max_tokens: 100,
        temperature: 0.5,
        n: 1,
      });

      const isRelevant = response.choices && response.choices.length > 0 && response.choices[0].message.content.includes('relevant');
      evaluationResult.push({ language: answer.language, answer: answer.answer, isRelevant });
    } catch (error) {
      console.error('Error evaluating candidate answer:', error);
      evaluationResult.push({ language: answer.language, answer: answer.answer, isRelevant: false });
    }
  }

  return evaluationResult;
}




module.exports = candidateRouter;
