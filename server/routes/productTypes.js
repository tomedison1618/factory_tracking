const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM product_types');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching product types');
  }
});

router.post('/', async (req, res) => {
  const { typeName, partNumber } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO product_types (typeName, partNumber) VALUES (?, ?)',
      [typeName, partNumber]
    );
    res.status(201).json({ id: result.insertId, typeName, partNumber });
  } catch (error) {
    console.error('Error creating product type:', error);
    res.status(500).send('Error creating product type');
  }
});

module.exports = router;
