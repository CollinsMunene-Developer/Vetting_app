const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// POST endpoint to receive user's proficiency and knowledge levels
app.post('/proficiency', async (req, res) => {
  const { languages } = req.body;

  // Check if user provided proficiency in at least three languages
  if (!languages || languages.length < 3) {
    return res.status(400).json({First: 'Please provide proficiency in at least three languages.' });
  }

  // Generate questions based on user's proficiency
  const questions = [];
  for (const language of languages) {
    const { name, proficiency } = language;
    let knowledgeLevel = '';
    if (proficiency >= 8) knowledgeLevel = 'expert';
    else if (proficiency >= 6) knowledgeLevel = 'advanced';
    else knowledgeLevel = 'intermediate';

    // Generate question for each language
    const response = await openai.complete({
      engine: 'text-davinci-002',
      prompt: `I am proficient in ${name} programming language at a level of ${proficiency}. Could you ask me some questions to test my ${knowledgeLevel} knowledge?`,
      maxTokens: 100,
      temperature: 0.5,
      n: 1
    });

    const question = response.data.choices[0].text.trim();
    questions.push({ language: name, question });
  }

  res.json({ questions });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});