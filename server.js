const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const { Question, Answer } = require('./models');

// Initialize OpenAI
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const app = express();

// Enable CORS for all routes
app.use(cors());

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Candidate API',
      version: '1.0.0',
      description: 'API Documentation for Candidate and Index Routes',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Require routes
const indexRoutes = require('./routes/index')(openai);
const candidateRoutes = require('./routes/candidate');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDb Connected'))
  .catch(err => console.log('MongoDB Connection Error', err));

// Use routes
app.use('/', indexRoutes);
app.use('/candidate', candidateRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
