require("dotenv").config();
const express = require('express');
const indexRouter = require('./routes/index');
const app = express();


const openai = require('openai');
const openaiInstance = new openai.OpenAI(process.env.OPENAI_API_KEY);

app.use('/', indexRouter(openaiInstance));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});