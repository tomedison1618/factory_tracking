const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM production_stages');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching production stages');
  }
});

module.exports = router;
