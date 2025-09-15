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

router.post('/', async (req, res) => {
  const { productTypeId, stageName, sequenceOrder } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO production_stages (productTypeId, stageName, sequenceOrder) VALUES (?, ?, ?)',
      [productTypeId, stageName, sequenceOrder]
    );
    res.status(201).json({ id: result.insertId, productTypeId, stageName, sequenceOrder });
  } catch (error) {
    console.error('Error creating production stage:', error);
    res.status(500).send('Error creating production stage');
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { stageName, sequenceOrder } = req.body;
  try {
    await db.query(
      'UPDATE production_stages SET stageName = ?, sequenceOrder = ? WHERE id = ?',
      [stageName, sequenceOrder, id]
    );
    res.status(200).json({ id, stageName, sequenceOrder });
  } catch (error) {
    console.error(`Error updating production stage ${id}:`, error);
    res.status(500).send(`Error updating production stage ${id}`);
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the stage is used in any job_stage_statuses
    const [rows] = await db.query('SELECT * FROM job_stage_statuses WHERE productionStageId = ?', [id]);
    if (rows.length > 0) {
      return res.status(400).send('Cannot delete stage that is in use by a job.');
    }

    await db.query('DELETE FROM production_stages WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting production stage ${id}:`, error);
    res.status(500).send(`Error deleting production stage ${id}`);
  }
});

router.post('/bulk', async (req, res) => {
  const { stages, productTypeId } = req.body; // Expecting an array of stages and a productTypeId

  if (!stages || !Array.isArray(stages) || stages.length === 0) {
    return res.status(400).send('Stages array is required.');
  }
  if (!productTypeId) {
    return res.status(400).send('productTypeId is required.');
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const insertedStages = [];
    for (const stage of stages) {
      const { stageName, sequenceOrder } = stage;
      const [result] = await connection.query(
        'INSERT INTO production_stages (productTypeId, stageName, sequenceOrder) VALUES (?, ?, ?)',
        [productTypeId, stageName, sequenceOrder]
      );
      insertedStages.push({ id: result.insertId, productTypeId, stageName, sequenceOrder });
    }

    await connection.commit();
    res.status(201).json(insertedStages);
  } catch (error) {
    await connection.rollback();
    console.error('Error bulk creating production stages:', error);
    res.status(500).send('Error bulk creating production stages');
  } finally {
    connection.release();
  }
});

module.exports = router;
