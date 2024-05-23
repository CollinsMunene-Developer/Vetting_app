//routes/index.js
/**
 * @swagger
 * /generate-questions:
 *   get:
 *     summary: Generate interview questions
 *     responses:
 *       200:
 *         description: A list of generated questions
 *       500:
 *         description: Internal server error
 */

const express = require('express');

module.exports = (openai) => {
  const router = express.Router();
  async function generateQuestions() {
    const prompts = [
      "What are your strengths and weaknesses?",
      "Can you describe a challenging problem you faced and how you solved it?",
      "Where do you see yourself in five years?",
      "Why do you want to work here?",
      "Tell me about a time you demonstrated leadership skills.",
      "How do you handle stress and pressure?",
      "What motivates you?",
      "Can you give an example of a time you worked well in a team?",
      "How do you prioritize your work?",
      "What are your career goals?"
    ];
  
    const numQuestions = 10; // Adjust the number of questions here
    const temperature = 0.5;
    const maxTokens = 100;
    let generatedQuestions = [];
    let previousQuestions = new Set();
  
    while (generatedQuestions.length < numQuestions) {
      const prompt = prompts[Math.floor(Math.random() * prompts.length)];
      const messages = [
        { role: "system", content: "You are an interview question generator." },
        { role: "user", content: `Generate a follow-up interview question based on the following: ${prompt}` }
      ];
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
      });
  
      const generatedQuestion = response.choices[0].message.content.trim();
  
      if (!previousQuestions.has(generatedQuestion) && !isSimilarToPrevious(generatedQuestion, generatedQuestions)) {
        generatedQuestions.push(generatedQuestion);
        previousQuestions.add(generatedQuestion);
      }
    }
    return generatedQuestions;
  }
  

  router.get('/generate-questions', async (req, res) => {
    try {
      const questions = await generateQuestions();
      res.json({ questions });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/submit-answers', async (req, res) => {
    try {
      const { candidateId, answers } = req.body;
      // Save the candidate's answers to the database
      // await Candidate.create({ candidateId, answers });
      res.status(200).json({ message: 'Answers submitted successfully' });
    } catch (error) {
      console.error("Error submitting answers:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

function isSimilarToPrevious(question, previousQuestions) {
  const similarityThreshold = 0.6;
  for (const prevQuestion of previousQuestions) {
    const similarity = compareQuestions(question, prevQuestion);
    if (similarity > similarityThreshold) {
      return true;
    }
  }
  return false;
}

function compareQuestions(question1, question2) {
  const distance = levenshteinDistance(question1.toLowerCase(), question2.toLowerCase());
  const maxLength = Math.max(question1.length, question2.length);
  const similarity = 1 - distance / maxLength;
  return similarity;
}

function levenshteinDistance(str1, str2) {
  const dp = Array.from(Array(str1.length + 1), () => Array(str2.length + 1).fill(0));
  for (let i = 0; i <= str1.length; i++) {
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        dp[i][j] = j;
      } else if (j === 0) {
        dp[i][j] = i;
      } else if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[str1.length][str2.length];
}
