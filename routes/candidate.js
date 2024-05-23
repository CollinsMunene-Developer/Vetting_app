const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const nodemailer = require('nodemailer');
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const candidateRouter = express.Router();

candidateRouter.use(bodyParser.json());
candidateRouter.use(bodyParser.urlencoded({ extended: true }));

let candidateDetails = {}; // Define candidateDetails at the module level

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

  candidateDetails = { fullName, idNumber, email };

  res.json({ message: 'Details received. Now, please provide your language proficiencies.' });
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
  const { languages } = req.body;

  if (!languages || languages.length < 3) {
    return res.status(400).json({ error: 'Please provide proficiency in at least three languages.' });
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

  res.json({ questions });
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
 *               answers:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - answers
 *     responses:
 *       200:
 *         description: Evaluation result
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
candidateRouter.post('/submitAnswers', async (req, res) => {
  const { answers } = req.body;

  if (!answers || answers.length === 0) {
    return res.status(400).json({ error: 'Please provide answers to the generated questions.' });
  }

  const evaluationResult = await evaluateCandidate(answers);

  // Send evaluation result via email to employer and candidate
  sendEvaluationEmail(candidateDetails.email, evaluationResult);

  res.json({ evaluationResult });
});

async function evaluateCandidate(candidateAnswers) {
  const evaluationResult = [];

  for (const answer of candidateAnswers) {
    try {
      // Send candidate answer to OpenAI for evaluation
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Evaluate the following answer and determine if it is relevant: ${answer}`
          }
        ],
        max_tokens: 100,
        temperature: 0.5,
        n: 1,
      });

      const isRelevant = response.choices && response.choices.length > 0 && response.choices[0].message.content.includes('relevant');
      evaluationResult.push({ answer, isRelevant });
    } catch (error) {
      console.error('Error evaluating candidate answer:', error);
      evaluationResult.push({ answer, isRelevant: false });
    }
  }

  return evaluationResult;
}


function sendEvaluationEmail(email, evaluationResult) {
  const message = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Evaluation Report',
    text: 'Here is the evaluation report for your language proficiencies:',
    html: generateEvaluationHTML(evaluationResult),
  };

  transporter.sendMail(message, (error, info) => {
    if (error) {
      console.error('Error sending evaluation email:', error);
    } else {
      console.log('Evaluation email sent:', info.response);
    }
  });
}

function generateEvaluationHTML(evaluationResult) {
  let html = '<ul>';
  evaluationResult.forEach((result, index) => {
    html += `<li>Answer ${index + 1}: ${result.answer} - ${result.isRelevant ? 'Relevant' : 'Not Relevant'}</li>`;
  });
  html += '</ul>';
  return html;
}
module.exports = candidateRouter;
