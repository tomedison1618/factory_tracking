const express = require('express');
const router = express.Router();
const db = require('../db');
const json2xls = require('json2xls');

// Job Completion Report
router.get('/job-completion', async (req, res) => {
  const { startDate, endDate, export: exportXls } = req.query;

  try {
    const connection = await db.getConnection();

    let query = `
      SELECT 
        j.id as jobId, 
        j.docketNumber, 
        pt.name as productTypeName, 
        j.quantity, 
        j.dueDate, 
        j.status, 
        MIN(se.timestamp) as firstEvent, 
        MAX(se.timestamp) as lastEvent,
        (SELECT SUM(failedCount) FROM job_stage_statuses WHERE jobId = j.id) as totalFailed,
        (SELECT SUM(scrappedCount) FROM job_stage_statuses WHERE jobId = j.id) as totalScrapped
      FROM jobs j
      JOIN product_types pt ON j.productTypeId = pt.id
      LEFT JOIN products p ON p.jobId = j.id
      LEFT JOIN product_stage_links psl ON psl.productId = p.id
      LEFT JOIN stage_events se ON se.productStageLinkId = psl.id
      WHERE j.status = 'Completed'
    `;

    const params = [];
    if (startDate) {
      query += ' AND DATE(se.timestamp) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(se.timestamp) <= ?';
      params.push(endDate);
    }

    query += ' GROUP BY j.id';

    const [rows] = await connection.query(query, params);
    connection.release();

    const reportData = rows.map(row => ({
      ...row,
      duration: row.firstEvent && row.lastEvent ? (new Date(row.lastEvent) - new Date(row.firstEvent)) / (1000 * 60 * 60 * 24) : null, // duration in days
      onTime: row.dueDate && row.lastEvent ? new Date(row.lastEvent) <= new Date(row.dueDate) : null
    }));

    if (exportXls === 'true') {
      const xls = json2xls(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=job-completion-report.xlsx');
      res.end(xls, 'binary');
    } else {
      res.json(reportData);
    }

  } catch (error) {
    console.error('Error generating job completion report:', error);
    res.status(500).send('Error generating report');
  }
});

module.exports = router;

// Failure Analysis Report
router.get('/failure-analysis', async (req, res) => {
  const { startDate, endDate, export: exportXls } = req.query;

  try {
    const connection = await db.getConnection();

    let query = `
      SELECT
        se.id as eventId,
        se.timestamp,
        se.notes,
        se.status as eventStatus,
        p.serialNumber,
        j.docketNumber,
        pt.name as productTypeName,
        ps.name as stageName,
        u.name as userName
      FROM stage_events se
      JOIN product_stage_links psl ON se.productStageLinkId = psl.id
      JOIN products p ON psl.productId = p.id
      JOIN jobs j ON p.jobId = j.id
      JOIN product_types pt ON j.productTypeId = pt.id
      JOIN production_stages ps ON psl.productionStageId = ps.id
      LEFT JOIN users u ON se.userId = u.id
      WHERE se.status = 'FAILED'
    `;

    const params = [];
    if (startDate) {
      query += ' AND DATE(se.timestamp) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(se.timestamp) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY se.timestamp DESC';

    const [rows] = await connection.query(query, params);
    connection.release();

    if (exportXls === 'true') {
      const xls = json2xls(rows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=failure-analysis-report.xlsx');
      res.end(xls, 'binary');
    } else {
      res.json(rows);
    }

  } catch (error) {
    console.error('Error generating failure analysis report:', error);
    res.status(500).send('Error generating report');
  }
});

// Technician Performance Report
router.get('/technician-performance', async (req, res) => {
  const { startDate, endDate, userId, export: exportXls } = req.query;

  try {
    const connection = await db.getConnection();

    let query = `
      SELECT
        u.id as userId,
        u.name as userName,
        ps.id as stageId,
        ps.name as stageName,
        COUNT(CASE WHEN se.status = 'PASSED' THEN 1 END) as passedCount,
        COUNT(CASE WHEN se.status = 'FAILED' THEN 1 END) as failedCount,
        AVG(TIMESTAMPDIFF(SECOND, se_start.timestamp, se.timestamp)) as avgTimeInSeconds
      FROM stage_events se
      JOIN product_stage_links psl ON se.productStageLinkId = psl.id
      JOIN production_stages ps ON psl.productionStageId = ps.id
      JOIN users u ON se.userId = u.id
      LEFT JOIN stage_events se_start ON se_start.productStageLinkId = se.productStageLinkId AND se_start.status = 'STARTED' AND se_start.timestamp < se.timestamp
      WHERE se.status IN ('PASSED', 'FAILED')
    `;

    const params = [];
    if (startDate) {
      query += ' AND DATE(se.timestamp) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(se.timestamp) <= ?';
      params.push(endDate);
    }
    if (userId) {
      query += ' AND u.id = ?';
      params.push(userId);
    }

    query += ' GROUP BY u.id, u.name, ps.id, ps.name';

    const [rows] = await connection.query(query, params);
    connection.release();

    const reportData = rows.map(row => ({
      ...row,
      totalOperations: row.passedCount + row.failedCount,
      qualityRate: row.passedCount + row.failedCount > 0 ? (row.passedCount / (row.passedCount + row.failedCount)) * 100 : 0,
      avgTimeInMinutes: row.avgTimeInSeconds ? row.avgTimeInSeconds / 60 : null
    }));

    if (exportXls === 'true') {
      const xls = json2xls(reportData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=technician-performance-report.xlsx');
      res.end(xls, 'binary');
    } else {
      res.json(reportData);
    }

  } catch (error) {
    console.error('Error generating technician performance report:', error);
    res.status(500).send('Error generating report');
  }
});
