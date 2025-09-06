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

module.exports = router;
