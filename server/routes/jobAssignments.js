const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all assignments (can be kept for admin purposes if needed)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM job_assignments');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching job assignments');
  }
});

// Get assignments for a specific job
router.get('/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM job_assignments WHERE jobId = ?', [jobId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Error fetching assignments for job ${jobId}`);
  }
});

// Create a new job assignment
router.post('/', async (req, res) => {
  const { jobId, productionStageId, userId } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO job_assignments (jobId, productionStageId, userId) VALUES (?, ?, ?)',
      [jobId, productionStageId, userId]
    );
    res.status(201).json({ id: result.insertId, jobId, productionStageId, userId });
  } catch (error) {
    console.error('Error creating job assignment:', error);
    res.status(500).send('Error creating job assignment');
  }
});

// Delete a job assignment
router.delete('/', async (req, res) => {
  const { jobId, productionStageId, userId } = req.body;
  try {
    await db.query(
      'DELETE FROM job_assignments WHERE jobId = ? AND productionStageId = ? AND userId = ?',
      [jobId, productionStageId, userId]
    );
    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error deleting job assignment:', error);
    res.status(500).send('Error deleting job assignment');
  }
});

module.exports = router;
