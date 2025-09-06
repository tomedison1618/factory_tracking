const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM stage_events');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching stage events');
  }
});

module.exports = router;
