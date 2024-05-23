// models.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for candidate
const candidateSchema = new Schema({
  fullName: { type: String, required: true },
  idNumber: { type: String, required: true },
  email: { type: String, required: true },
  questions: [
    {
      language: { type: String, required: true },
      question: { type: String, required: true }
    }
  ],
  answers: [
    {
      language: { type: String, required: true },
      answer: { type: String, required: true },
      isRelevant: { type: Boolean, required: true }
    }
  ]
});

// Schema for questions (if needed separately)
const questionSchema = new Schema({
  question: String,
});

// Schema for answers (if needed separately)
const answerSchema = new Schema({
  candidateId: String,
  answers: [String],
});

const Candidate = mongoose.model('Candidate', candidateSchema);
const Question = mongoose.model('Question', questionSchema);
const Answer = mongoose.model('Answer', answerSchema);

module.exports = { Candidate, Question, Answer };
