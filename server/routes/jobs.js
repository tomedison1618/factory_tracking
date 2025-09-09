const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        j.*,
        pt.typeName as productTypeName,
        pt.partNumber as productTypePartNumber
      FROM jobs as j
      LEFT JOIN product_types as pt ON j.productTypeId = pt.id
    `);
    const jobs = rows.map(job => ({
      ...job,
      productType: {
        id: job.productTypeId,
        typeName: job.productTypeName,
        partNumber: job.productTypePartNumber
      }
    }));
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching jobs');
  }
});

router.post('/', async (req, res) => {
  const { docketNumber, quantity, productTypeId, priority, dueDate } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Create Job
    const [jobResult] = await connection.query(
      'INSERT INTO jobs (docketNumber, quantity, productTypeId, priority, dueDate, status) VALUES (?, ?, ?, ?, ?, ?)',
      [docketNumber, quantity, productTypeId, priority, dueDate, 'Open']
    );
    const newJobId = jobResult.insertId;

    // 2. Get stages for the product type
    const [stages] = await connection.query(
      'SELECT id, sequenceOrder FROM production_stages WHERE productTypeId = ? ORDER BY sequenceOrder ASC',
      [productTypeId]
    );

    if (stages.length === 0) {
      throw new Error(`No production stages found for productTypeId: ${productTypeId}`);
    }

    const firstStageId = stages[0].id;

    // 3. Create Products, Links, and initial Events
    for (let i = 1; i <= quantity; i++) {
      const serialNumber = `${docketNumber}-${i.toString().padStart(3, '0')}`;
      const [productResult] = await connection.query(
        'INSERT INTO products (jobId, serialNumber, status) VALUES (?, ?, ?)',
        [newJobId, serialNumber, 'Pending']
      );
      const newProductId = productResult.insertId;

      for (const stage of stages) {
        const [linkResult] = await connection.query(
          'INSERT INTO product_stage_links (productId, productionStageId) VALUES (?, ?)',
          [newProductId, stage.id]
        );
        
        // Create initial PENDING event for the first stage
        if (stage.id === firstStageId) {
          const newLinkId = linkResult.insertId;
          await connection.query(
            'INSERT INTO stage_events (productStageLinkId, status, timestamp) VALUES (?, ?, NOW())',
            [newLinkId, 'PENDING']
          );
        }
      }
    }

    // 4. Create Job Stage Statuses
    for (const stage of stages) {
      const initialStatus = stage.id === firstStageId ? 'In Progress' : 'Pending';
      await connection.query(
        'INSERT INTO job_stage_statuses (jobId, productionStageId, status, passedCount, failedCount, scrappedCount) VALUES (?, ?, ?, 0, 0, 0)',
        [newJobId, stage.id, initialStatus]
      );
    }

    await connection.commit();
    
    // Fetch the newly created job to return it
    const [newJobRows] = await connection.query('SELECT * FROM jobs WHERE id = ?', [newJobId]);
    res.status(201).json(newJobRows[0]);

  } catch (error) {
    await connection.rollback();
    console.error('Error creating job:', error);
    res.status(500).send('Error creating job');
  } finally {
    connection.release();
  }
});

module.exports = router;
