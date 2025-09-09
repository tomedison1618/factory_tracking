const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/ask', async (req, res) => {
  const { question, history } = req.body;

  if (!question) {
    return res.status(400).send('Question is required');
  }

  try {
    const connection = await db.getConnection();
    // 1. Fetch all data from the database
    const [jobs] = await connection.query('SELECT * FROM jobs');
    const [users] = await connection.query('SELECT id, name, role FROM users');
    const [productTypes] = await connection.query('SELECT * FROM product_types');
    const [productionStages] = await connection.query('SELECT * FROM production_stages');
    const [products] = await connection.query('SELECT * FROM products');
    const [jobAssignments] = await connection.query('SELECT * FROM job_assignments');
    const [jobStageStatuses] = await connection.query('SELECT * FROM job_stage_statuses');
    const [stageEvents] = await connection.query('SELECT * FROM stage_events');

    connection.release();

    const productionData = {
      jobs,
      users,
      productTypes,
      productionStages,
      products,
      jobAssignments,
      jobStageStatuses,
      stageEvents,
    };

    // 2. (Placeholder) Call Gemini API with the data and question
    // In a real implementation, you would use the @google/genai library here
    // and pass the productionData and question to the model.

    // 3. Return a mock response in the specified format
    const mockResponse = {
      type: 'text',
      content: `This is a mock response to your question: "${question}". The AI assistant is not yet fully implemented.`
    };

    res.json(mockResponse);

  } catch (error) {
    console.error('Error in AI assistant:', error);
    res.status(500).send('Error processing your question');
  }
});

module.exports = router;
