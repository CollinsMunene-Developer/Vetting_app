// nodemailler.js
/**
 * @swagger
 * /candidate/sendEmail:
 *   post:
 *     summary: Send an email to the candidate
 *     description: |
 *       This endpoint sends an email to the candidate based on the provided parameters.
 *       It is typically used to inform the candidate about the interview result.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidateId:
 *                 type: string
 *               emailType:
 *                 type: string
 *                 enum: [pass, fail]
 *             required:
 *               - candidateId
 *               - emailType
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Candidate not found
 *       500:
 *         description: Internal server error
 */


const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'collinsentrepreneur@gmail.com',
    pass: 'qpqy vqsn jmmm lfmi',
  },
});
const sendEvaluationEmail = (email, evaluationResult, hasPassed) => {
  const subject = hasPassed ? 'Interview Result: Passed' : 'Interview Result: Not Passed';
  const message = hasPassed ? 
    'Congratulations! You have passed the interview.' : 
    'We regret to inform you that you did not pass the interview.';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    text: `${message}\n\nEvaluation Details:\n${JSON.stringify(evaluationResult, null, 2)}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

module.exports = { sendEvaluationEmail };

