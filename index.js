import express from 'express';
import OpenAI from "openai";

require("dotenv").config();
import { Configuration, OPENAIAPI } from "openai";


import { Models } from 'openai/resources/models.mjs';


const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

// OpenAI Configuration
const configuration = new Configuration({
    apiKey: process.env.OPEN_AI_KEY,
});
const openai = new OPENAIAPI(configuration);

// Function to generate questions
async function generateQuestions() {
    const prompts = [
        "What are your strengths and weaknesses?",
        "Can you describe a challenging problem you faced and how you solved it?",
        // Add more prompts here...
    ];

    const numQuestions = 1000;
    const temperature = 0.7;
    const maxTokens = 100;

    let generatedQuestions = [];
    let previousQuestions = new Set();

    while (generatedQuestions.length < numQuestions) {
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];

        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: `${prompt} What is Freelancin`,
            max_tokens: maxTokens,
            temperature: temperature
        });

        const generatedQuestion = response.data.choices[0].text;

        if (!previousQuestions.has(generatedQuestion) && !isSimilarToPrevious(generatedQuestion, generatedQuestions)) {
            generatedQuestions.push(generatedQuestion);
            previousQuestions.add(generatedQuestion);
        }
    }

    return generatedQuestions;
}

// Route handler to generate questions
app.get('/generate-questions', async (req, res) => {
    try {
        const questions = await generateQuestions();
        res.json({ questions });
    } catch (error) {
        console.error("Error generating questions:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
