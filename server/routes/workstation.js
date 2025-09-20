const express = require('express');
const router = express.Router();
const db = require('../db');

// Start work on one or more products at a specific stage
router.post('/start', async (req, res) => {
  const { productIds, stageId, userId } = req.body;
  const connection = await db.getConnection();

  if (!productIds || !stageId || !userId) {
    return res.status(400).send('productIds, stageId, and userId are required');
  }

  try {
    await connection.beginTransaction();

    for (const productId of productIds) {
      // 1. Find the product_stage_link for the given product and stage
      const [links] = await connection.query(
        'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
        [productId, stageId]
      );

      if (links.length === 0) {
        throw new Error(`No product_stage_link found for productId ${productId} and stageId ${stageId}`);
      }
      const linkId = links[0].id;

      // 2. Create a new 'STARTED' event
      await connection.query(
        'INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())',
        [linkId, 'STARTED', userId]
      );

      // 3. Update the product's status to 'In Progress' and assign the worker
      await connection.query(
        'UPDATE products SET status = ?, currentWorkerId = ? WHERE id = ?',
        ['In Progress', userId, productId]
      );
    }

    await connection.commit();
    res.status(200).send('Work started successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error starting work:', error);
    res.status(500).send('Error starting work');
  } finally {
    connection.release();
  }
});

router.post('/pass', async (req, res) => {
  const { productIds, stageId, userId } = req.body;
  const connection = await db.getConnection();

  if (!productIds || !stageId || !userId) {
    return res.status(400).send('productIds, stageId, and userId are required');
  }

  try {
    await connection.beginTransaction();

    for (const productId of productIds) {
      const [productRows] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
      const product = productRows[0];
      const jobId = product.jobId;

      const [jobRows] = await connection.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
      const job = jobRows[0];
      const productTypeId = job.productTypeId;

      // 1. Find the current product_stage_link
      const [currentLinks] = await connection.query(
        'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
        [productId, stageId]
      );
      if (currentLinks.length === 0) throw new Error(`No link for product ${productId} at stage ${stageId}`);
      const currentLinkId = currentLinks[0].id;

      // 2. Create 'PASSED' event
      await connection.query(
        'INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())',
        [currentLinkId, 'PASSED', userId]
      );

      // 3. Find next stage
      const [stages] = await connection.query(
        'SELECT id, sequenceOrder FROM production_stages WHERE productTypeId = ? ORDER BY sequenceOrder ASC',
        [productTypeId]
      );
      const currentStage = stages.find(s => s.id === stageId);
      const currentStageIndex = stages.indexOf(currentStage);
      const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

      let newProductStatus = 'Pending';
      if (!nextStage) {
        newProductStatus = 'Completed';
      } else {
        // 4. Create 'PENDING' event for next stage
        const [nextLinks] = await connection.query(
          'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
          [productId, nextStage.id]
        );
        if (nextLinks.length === 0) throw new Error(`No link for product ${productId} at next stage ${nextStage.id}`);
        const nextLinkId = nextLinks[0].id;
        await connection.query(
          'INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())',
          [nextLinkId, 'PENDING', userId]
        );
      }

      // 5. Update product status
      await connection.query(
        'UPDATE products SET status = ?, currentWorkerId = NULL WHERE id = ?',
        [newProductStatus, productId]
      );

      // 6. Update job_stage_status for current stage
      await connection.query(
        'UPDATE job_stage_statuses SET passedCount = passedCount + 1 WHERE jobId = ? AND productionStageId = ?',
        [jobId, stageId]
      );

      // 7. Update job_stage_status for next stage
      if (nextStage) {
        await connection.query(
          'UPDATE job_stage_statuses SET status = \'In Progress\' WHERE jobId = ? AND productionStageId = ? AND status = \'Pending\'',
          [jobId, nextStage.id]
        );
      }
    }

    // 8. Check if job is complete
    const [productsInJob] = await connection.query('SELECT status FROM products WHERE jobId = (SELECT jobId FROM products WHERE id = ? LIMIT 1)', [productIds[0]]);
    const allProductsFinished = productsInJob.every(p => p.status === 'Completed' || p.status === 'Scrapped');
    if (allProductsFinished) {
      const jobId = (await connection.query('SELECT jobId FROM products WHERE id = ?', [productIds[0]]))[0][0].jobId;
      await connection.query('UPDATE jobs SET status = ? WHERE id = ?', ['Completed', jobId]);
    }

    await connection.commit();
    res.status(200).send('Products passed successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error passing products:', error);
    res.status(500).send('Error passing products');
  } finally {
    connection.release();
  }
});

router.post('/fail', async (req, res) => {
  const { productId, stageId, userId, notes } = req.body;
  const connection = await db.getConnection();

  if (!productId || !stageId || !userId) {
    return res.status(400).send('productId, stageId, and userId are required');
  }

  try {
    await connection.beginTransaction();

    // 1. Find the product_stage_link
    const [links] = await connection.query(
      'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
      [productId, stageId]
    );
    if (links.length === 0) throw new Error(`No link for product ${productId} at stage ${stageId}`);
    const linkId = links[0].id;

    // 2. Create 'FAILED' event
    await connection.query(
      'INSERT INTO stage_events (productStageLinkId, status, userId, notes, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [linkId, 'FAILED', userId, notes]
    );

    // 3. Update product status
    await connection.query(
      'UPDATE products SET status = \'Failed\', currentWorkerId = NULL WHERE id = ?',
      [productId]
    );

    // 4. Update job_stage_status
    const [productRows] = await connection.query('SELECT jobId FROM products WHERE id = ?', [productId]);
    const jobId = productRows[0].jobId;
    await connection.query(
      'UPDATE job_stage_statuses SET failedCount = failedCount + 1 WHERE jobId = ? AND productionStageId = ?',
      [jobId, stageId]
    );

    await connection.commit();
    res.status(200).send('Product failed successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error failing product:', error);
    res.status(500).send('Error failing product');
  } finally {
    connection.release();
  }
});

router.post('/rework', async (req, res) => {
  const { productId, stageId, userId } = req.body;
  const connection = await db.getConnection();

  if (!productId || !userId) {
    return res.status(400).send('productId and userId are required');
  }

  const stageIdNum = stageId === undefined || stageId === null ? null : Number(stageId);
  if (stageId !== undefined && stageId !== null && Number.isNaN(stageIdNum)) {
    return res.status(400).send('stageId must be a valid number when provided.');
  }

  try {
    await connection.beginTransaction();

    // 1. Find the latest FAILED event for the product
    const [failedEvents] = await connection.query(`
      SELECT se.*, psl.productionStageId, p.jobId
      FROM stage_events se
      JOIN product_stage_links psl ON se.productStageLinkId = psl.id
      JOIN products p ON psl.productId = p.id
      WHERE psl.productId = ? AND se.status = 'FAILED'
      ORDER BY se.timestamp DESC
      LIMIT 1
    `, [productId]);

    if (failedEvents.length === 0) {
      throw new Error(`No FAILED event found for product ${productId} to rework.`);
    }
    const failedEvent = failedEvents[0];
    const { productStageLinkId: failedLinkId, productionStageId: failedStageId, jobId, userId: failedByUserId } = failedEvent;

    if (stageIdNum !== null && failedStageId !== stageIdNum) {
      await connection.rollback();
      return res.status(400).send('The stageId provided does not match the stage where the product failed.');
    }

    // 2. Find the product type and its stages
    const [jobRows] = await connection.query('SELECT productTypeId FROM jobs WHERE id = ?', [jobId]);
    const productTypeId = jobRows[0].productTypeId;
    const [stages] = await connection.query(
      'SELECT id, stageName, sequenceOrder FROM production_stages WHERE productTypeId = ? ORDER BY sequenceOrder ASC',
      [productTypeId]
    );

    const failedStageIndex = stages.findIndex(s => s.id === failedStageId);
    if (failedStageIndex === -1) {
      throw new Error(`Stage ${failedStageId} is not part of the product type workflow.`);
    }

    if (failedStageIndex === 0) {
      await connection.rollback();
      return res.status(400).send('Cannot rework product from the first production stage.');
    }

    if (failedByUserId !== null && failedByUserId !== userId) {
      await connection.rollback();
      return res.status(403).send('Only the technician who failed the product can send it for rework.');
    }

    const reworkStage = stages[failedStageIndex - 1];

    // 3. Create RESET event for the failed stage
    await connection.query(
      "INSERT INTO stage_events (productStageLinkId, status, userId, notes, timestamp) VALUES (?, ?, ?, ?, NOW())",
      [failedLinkId, 'RESET', userId, `Reworking back to stage: ${reworkStage.stageName}`]
    );

    // 4. Create PENDING event for the previous stage
    const [prevLinks] = await connection.query(
      "SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?",
      [productId, reworkStage.id]
    );
    if (prevLinks.length === 0) {
      throw new Error(`No link for product ${productId} at previous stage ${reworkStage.id}`);
    }
    const prevLinkId = prevLinks[0].id;
    await connection.query(
      "INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())",
      [prevLinkId, 'PENDING', userId]
    );

    // 5. Update product status to Pending
    await connection.query("UPDATE products SET status = 'Pending' WHERE id = ?", [productId]);

    // 6. Re-open the previous stage in job_stage_statuses
    await connection.query(
      "UPDATE job_stage_statuses SET passedCount = GREATEST(passedCount - 1, 0), status = 'In Progress' WHERE jobId = ? AND productionStageId = ?",
      [jobId, reworkStage.id]
    );

    // 7. Decrement failedCount for the failed stage
    await connection.query(
      "UPDATE job_stage_statuses SET failedCount = failedCount - 1 WHERE jobId = ? AND productionStageId = ? AND failedCount > 0",
      [jobId, failedStageId]
    );

    await connection.commit();
    res.status(200).send('Product sent for rework successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error reworking product:', error);
    res.status(500).send('Error reworking product');
  } finally {
    connection.release();
  }
});

router.post('/move', async (req, res) => {
  const { productId, targetStageId, userId } = req.body;
  const connection = await db.getConnection();

  if (!productId || !targetStageId || !userId) {
    return res.status(400).send('productId, targetStageId, and userId are required');
  }

  try {
    await connection.beginTransaction();

    // 1. Find the latest FAILED event for the product
    const [failedEvents] = await connection.query(`
      SELECT se.*, psl.productionStageId, p.jobId
      FROM stage_events se
      JOIN product_stage_links psl ON se.productStageLinkId = psl.id
      JOIN products p ON psl.productId = p.id
      WHERE psl.productId = ? AND se.status = 'FAILED'
      ORDER BY se.timestamp DESC
      LIMIT 1
    `, [productId]);

    if (failedEvents.length === 0) {
      throw new Error(`No FAILED event found for product ${productId} to move.`);
    }
    const failedEvent = failedEvents[0];
    const { productStageLinkId: failedLinkId, productionStageId: failedStageId, jobId } = failedEvent;
    const targetStageIdNum = Number(targetStageId);

    // 2. Load stage metadata for the product type
    const [jobRows] = await connection.query('SELECT productTypeId FROM jobs WHERE id = ?', [jobId]);
    const productTypeId = jobRows[0].productTypeId;
    const [stages] = await connection.query(
      'SELECT id, stageName, sequenceOrder FROM production_stages WHERE productTypeId = ? ORDER BY sequenceOrder ASC',
      [productTypeId]
    );

    const failedStageIndex = stages.findIndex(s => s.id === failedStageId);
    const targetStageIndex = stages.findIndex(s => s.id === targetStageIdNum);
    if (targetStageIndex === -1) {
      throw new Error(`Target stage ${targetStageId} is not valid for product ${productId}.`);
    }

    // 3. Create RESET event for the failed stage
    await connection.query(
      "INSERT INTO stage_events (productStageLinkId, status, userId, notes, timestamp) VALUES (?, ?, ?, ?, NOW())",
      [failedLinkId, 'RESET', userId, 'Manager moved product to another stage']
    );

    // 4. Create PENDING event for the target stage
    const [targetLinks] = await connection.query(
      "SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?",
      [productId, targetStageIdNum]
    );
    if (targetLinks.length === 0) {
      throw new Error(`No link for product ${productId} at target stage ${targetStageId}`);
    }
    const targetLinkId = targetLinks[0].id;
    await connection.query(
      "INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())",
      [targetLinkId, 'PENDING', userId]
    );

    // 5. Update product status to Pending
    await connection.query("UPDATE products SET status = 'Pending' WHERE id = ?", [productId]);

    // 6. Reconcile job_stage_statuses for the target stage (and earlier stages when moving backward)
    if (targetStageIndex < failedStageIndex) {
      for (let idx = targetStageIndex; idx < failedStageIndex; idx++) {
        const stageToAdjust = stages[idx];
        await connection.query(
          "UPDATE job_stage_statuses SET passedCount = GREATEST(passedCount - 1, 0), status = 'In Progress' WHERE jobId = ? AND productionStageId = ?",
          [jobId, stageToAdjust.id]
        );
      }
    } else {
      await connection.query(
        "UPDATE job_stage_statuses SET status = 'In Progress' WHERE jobId = ? AND productionStageId = ?",
        [jobId, targetStageIdNum]
      );
    }

    // 7. Decrement failedCount for the failed stage
    await connection.query(
      "UPDATE job_stage_statuses SET failedCount = failedCount - 1 WHERE jobId = ? AND productionStageId = ? AND failedCount > 0",
      [jobId, failedStageId]
    );

    await connection.commit();
    res.status(200).send('Product moved successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error moving product:', error);
    res.status(500).send('Error moving product');
  } finally {
    connection.release();
  }
});

router.post('/scrap', async (req, res) => {
  const { productId, userId, notes } = req.body;
  const connection = await db.getConnection();

  if (!productId || !userId) {
    return res.status(400).send('productId and userId are required');
  }

  try {
    await connection.beginTransaction();

    // 1. Find the product and its current state
    const [productRows] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) throw new Error(`Product with id ${productId} not found`);
    const product = productRows[0];
    const jobId = product.jobId;
    const wasFailed = product.status === 'Failed';

    // 2. Find its most recent event to determine its current stage
    const [latestEvents] = await connection.query(`
        SELECT psl.productionStageId, psl.id as productStageLinkId
        FROM stage_events se
        JOIN product_stage_links psl ON se.productStageLinkId = psl.id
        WHERE psl.productId = ?
        ORDER BY se.timestamp DESC
        LIMIT 1
    `, [productId]);
    if (latestEvents.length === 0) throw new Error(`Could not determine current stage for product ${productId}`);
    const { productionStageId, productStageLinkId } = latestEvents[0];

    // 3. Create SCRAPPED event
    await connection.query(
      'INSERT INTO stage_events (productStageLinkId, status, userId, notes, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [productStageLinkId, 'SCRAPPED', userId, notes]
    );

    // 4. Update product status to Scrapped
    await connection.query('UPDATE products SET status = \'Scrapped\', currentWorkerId = NULL WHERE id = ?', [productId]);

    // 5. Update job_stage_status
    let query = 'UPDATE job_stage_statuses SET scrappedCount = scrappedCount + 1';
    const params = [];
    if (wasFailed) {
      query += ', failedCount = failedCount - 1';
    }
    query += ' WHERE jobId = ? AND productionStageId = ?';
    params.push(jobId, productionStageId);
    await connection.query(query, params);

    // 6. Check if job is complete
    const [productsInJob] = await connection.query('SELECT status FROM products WHERE jobId = ?', [jobId]);
    const allProductsFinished = productsInJob.every(p => p.status === 'Completed' || p.status === 'Scrapped');
    if (allProductsFinished) {
      await connection.query('UPDATE jobs SET status = ? WHERE id = ?', ['Completed', jobId]);
    }

    await connection.commit();
    res.status(200).send('Product scrapped successfully');

  } catch (error) {
    await connection.rollback();
    console.error('Error scrapping product:', error);
    res.status(500).send('Error scrapping product');
  } finally {
    connection.release();
  }
});

router.post('/scan', async (req, res) => {
  const { scanInput, stageId, userId } = req.body;
  const connection = await db.getConnection();

  if (!scanInput || !stageId || !userId) {
    return res.status(400).send('scanInput, stageId, and userId are required');
  }

  try {
    await connection.beginTransaction();

    // 1. Find product by serial number
    const [products] = await connection.query('SELECT * FROM products WHERE serialNumber = ?', [scanInput]);

    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).send(`Product with serial number ${scanInput} not found`);
    }
    const product = products[0];
    const productId = product.id;
    const jobId = product.jobId;

    // 2. Find the product's current stage and status from the latest event
    const [latestEvents] = await connection.query(`
      SELECT se.status, psl.productionStageId
      FROM stage_events se
      JOIN product_stage_links psl ON se.productStageLinkId = psl.id
      WHERE psl.productId = ?
      ORDER BY se.timestamp DESC
      LIMIT 1
    `, [productId]);

    if (latestEvents.length === 0) {
        await connection.rollback();
        return res.status(400).send(`Product ${scanInput} has no history.`);
    }

    const latestEvent = latestEvents[0];
    const currentStageId = parseInt(stageId, 10);

    // ACTION: START WORK
    if (latestEvent.status === 'PENDING' && latestEvent.productionStageId === currentStageId) {
        const [links] = await connection.query(
            'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
            [productId, currentStageId]
        );
        if (links.length === 0) throw new Error(`No link for product ${productId} at stage ${currentStageId}`);
        const linkId = links[0].id;

        await connection.query(
            'INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())',
            [linkId, 'STARTED', userId]
        );

        await connection.query(
            'UPDATE products SET status = ?, currentWorkerId = ? WHERE id = ?',
            ['In Progress', userId, productId]
        );

        await connection.commit();
        return res.status(200).json({ action: 'started', message: `Started work on product ${scanInput}` });
    }
    // ACTION: PASS WORK
    else if (latestEvent.status === 'STARTED' && latestEvent.productionStageId === currentStageId) {
        const [jobRows] = await connection.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
        const job = jobRows[0];
        const productTypeId = job.productTypeId;

        const [currentLinks] = await connection.query(
            'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
            [productId, currentStageId]
        );
        if (currentLinks.length === 0) throw new Error(`No link for product ${productId} at stage ${currentStageId}`);
        const currentLinkId = currentLinks[0].id;

        await connection.query(
            'INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())',
            [currentLinkId, 'PASSED', userId]
        );

        const [stages] = await connection.query(
            'SELECT id, sequenceOrder FROM production_stages WHERE productTypeId = ? ORDER BY sequenceOrder ASC',
            [productTypeId]
        );
        const currentStageIndex = stages.findIndex(s => s.id === currentStageId);
        const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null;

        let newProductStatus = 'Pending';
        if (!nextStage) {
            newProductStatus = 'Completed';
        } else {
            const [nextLinks] = await connection.query(
                'SELECT id FROM product_stage_links WHERE productId = ? AND productionStageId = ?',
                [productId, nextStage.id]
            );
            if (nextLinks.length === 0) throw new Error(`No link for product ${productId} at next stage ${nextStage.id}`);
            const nextLinkId = nextLinks[0].id;
            await connection.query(
                'INSERT INTO stage_events (productStageLinkId, status, userId, timestamp) VALUES (?, ?, ?, NOW())',
                [nextLinkId, 'PENDING', userId]
            );
        }

        await connection.query(
            'UPDATE products SET status = ?, currentWorkerId = NULL WHERE id = ?',
            [newProductStatus, productId]
        );

        await connection.query(
            'UPDATE job_stage_statuses SET passedCount = passedCount + 1 WHERE jobId = ? AND productionStageId = ?',
            [jobId, currentStageId]
        );

        if (nextStage) {
            await connection.query(
                'UPDATE job_stage_statuses SET status = ? WHERE jobId = ? AND productionStageId = ? AND status = ?',
                ['In Progress', jobId, nextStage.id, 'Pending']
            );
        }

        const [productsInJob] = await connection.query('SELECT status FROM products WHERE jobId = ?', [jobId]);
        const allProductsFinished = productsInJob.every(p => p.status === 'Completed' || p.status === 'Scrapped');
        if (allProductsFinished) {
            await connection.query('UPDATE jobs SET status = ? WHERE id = ?', ['Completed', jobId]);
        }

        await connection.commit();
        return res.status(200).json({ action: 'passed', message: `Passed product ${scanInput}` });
    }
    else {
        await connection.rollback();
        return res.status(400).send(`Product ${scanInput} is in status '${latestEvent.status}' at stage ${latestEvent.productionStageId} and cannot be scanned at this station (stage ${currentStageId}).`);
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error processing scan:', error);
    res.status(500).send('Error processing scan: ' + error.message);
  } finally {
    connection.release();
  }
});

// Get data for the workstation page (pending products and user's active batch)
router.get('/data', async (req, res) => {
  const { jobId, stageId, userId } = req.query;
  const connection = await db.getConnection();

  if (!jobId || !stageId || !userId) {
    return res.status(400).send('jobId, stageId, and userId are required');
  }

  try {
    // Find the product_stage_link_ids for the current stage
    const [links] = await connection.query(
      'SELECT id FROM product_stage_links WHERE productionStageId = ? AND productId IN (SELECT id FROM products WHERE jobId = ?)',
      [stageId, jobId]
    );
    const linkIds = links.map(l => l.id);

    if (linkIds.length === 0) {
      return res.json({ pendingProducts: [], activeBatch: [] });
    }

    // Find all products that have a latest event of 'PENDING' for this stage
    const [pendingProducts] = await connection.query(`
      SELECT p.id, p.serialNumber
      FROM products p
      JOIN (
        SELECT psl.productId, MAX(se.timestamp) as max_ts
        FROM stage_events se
        JOIN product_stage_links psl ON se.productStageLinkId = psl.id
        WHERE psl.id IN (?) 
        GROUP BY psl.productId
      ) as latest_events ON p.id = latest_events.productId
      JOIN stage_events se ON se.timestamp = latest_events.max_ts
      JOIN product_stage_links psl ON se.productStageLinkId = psl.id AND p.id = psl.productId
      WHERE se.status = 'PENDING' AND psl.productionStageId = ?
    `, [linkIds, stageId]);


    // Find all products that are 'In Progress' and assigned to the current user for this stage
    const [activeBatch] = await connection.query(
      'SELECT id, serialNumber FROM products WHERE jobId = ? AND status = \'In Progress\' AND currentWorkerId = ?',
      [jobId, userId]
    );

    res.json({ pendingProducts, activeBatch });

  } catch (error) {
    console.error('Error fetching workstation data:', error);
    res.status(500).send('Error fetching workstation data');
  } finally {
    connection.release();
  }
});


module.exports = router;


