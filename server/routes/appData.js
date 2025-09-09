const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [jobs] = await db.query(`
      SELECT 
        j.*,
        pt.typeName as productTypeName,
        pt.partNumber as productTypePartNumber
      FROM jobs as j
      LEFT JOIN product_types as pt ON j.productTypeId = pt.id
    `);

    const [users] = await db.query('SELECT id, username, role FROM users'); // Exclude passwords
    const [productionStages] = await db.query('SELECT * FROM production_stages');
    const [productTypes] = await db.query('SELECT * FROM product_types');
    const [jobAssignments] = await db.query('SELECT * FROM job_assignments');
    const [jobStageStatuses] = await db.query('SELECT * FROM job_stage_statuses');
    const [products] = await db.query('SELECT * FROM products');
    const [productStageLinks] = await db.query('SELECT * FROM product_stage_links');
    const [stageEvents] = await db.query('SELECT * FROM stage_events');

    // The frontend expects the productType to be a nested object in each job
    const formattedJobs = jobs.map(job => ({
      ...job,
      productType: {
        id: job.productTypeId,
        typeName: job.productTypeName,
        partNumber: job.productTypePartNumber
      }
    }));

    res.json({
      jobs: formattedJobs,
      users,
      productionStages,
      productTypes,
      jobAssignments,
      jobStageStatuses,
      products,
      productStageLinks,
      stageEvents,
    });

  } catch (error) {
    console.error('Error fetching initial application data:', error);
    res.status(500).send('Error fetching initial application data');
  }
});

module.exports = router;
