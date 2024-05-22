const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const {connectToDatabase, getDatabase} = require('./database')
require('dotenv').config();

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const port = 3000;
const app = express();
//referencing database
let db;

//connnecting to the database
   connectToDatabase()
   .then(() => {
    db = getDatabase();
   })
   .catch(error => {
    console.error('Error connecting to MongoDB', error);
   });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let candidateDetails = {};

app.post('/submitDetails', async (req, res) => {
  console.log('Received request:', req.body); 

  const { fullName, idNumber } = req.body;

  if (!fullName || !idNumber) {
    console.error('Validation error: Missing full name or ID number');
    return res.status(400).json({ First: 'Please provide your full name and ID number.' });
  }

  candidateDetails = { fullName, idNumber };

  try {
    const collection = db.collection('candidates');
    await collection.insertOne({ fullName, idNumber });
  } catch (error) {
    console.error('Error inserting candidate details into the database:', error);
    return res.status(500).json({ error: 'Failed to insert candidate details into the database.' });
  }

  res.json({ message: 'Details received. Now, please provide your language proficiencies.' });
});

app.post('/submitLanguages', async (req, res) => {
  console.log('Received request:', req.body); 

  const { languages } = req.body;

  if (!languages || languages.length < 3) {
    console.error('Validation error: Missing required fields or insufficient languages');
    return res.status(400).json({ Then: 'Please provide proficiency in at least three languages.' });
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
        model: 'gpt-3.5-turbo-0125',
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

      console.log('OpenAI API Response:', response);

      if (response.choices && response.choices.length > 0) {
        const candidateMessage = response.choices[0].message.content;

        if (candidateMessage && typeof candidateMessage === 'string') {
          const question = candidateMessage.trim();
          questions.push({ language: name, question });
        } else {
          console.error('Invalid message content in response:', candidateMessage);
          questions.push({ language: name, question: 'Error generating question' });
        }
      } else {
        console.error('Invalid response format from OpenAI:', response);
        questions.push({ language: name, question: 'Error generating question' });
      }

    } catch (error) {
      console.error('Error generating question:', error);
      questions.push({ language: name, question: 'Error generating question' });
    }
  }

  try {
    const collection = db.collection('questions');
    await collection.insertMany(questions);
  } catch (error) {
    console.error('Error inserting generated questions into the database:', error);
    return res.status(500).json({ error: 'Failed to insert generated questions into the database.' });
  }

  console.log('Generated Questions:', questions); 

  res.json({ fullName: candidateDetails.fullName, idNumber: candidateDetails.idNumber, questions });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
