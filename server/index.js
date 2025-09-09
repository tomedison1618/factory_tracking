const express = require('express');
const cors = require('cors');
require('dotenv').config();

const jobsRouter = require('./routes/jobs');

const usersRouter = require('./routes/users');

const productionStagesRouter = require('./routes/productionStages');

const productTypesRouter = require('./routes/productTypes');

const jobAssignmentsRouter = require('./routes/jobAssignments');

const jobStageStatusesRouter = require('./routes/jobStageStatuses');

const productsRouter = require('./routes/products');

const productStageLinksRouter = require('./routes/productStageLinks');

const stageEventsRouter = require('./routes/stageEvents');
const appDataRouter = require('./routes/appData');
const workstationRouter = require('./routes/workstation');
const aiRouter = require('./routes/ai');
const reportsRouter = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/jobs', jobsRouter);
app.use('/api/users', usersRouter);
app.use('/api/production-stages', productionStagesRouter);
app.use('/api/product-types', productTypesRouter);
app.use('/api/job-assignments', jobAssignmentsRouter);
app.use('/api/job-stage-statuses', jobStageStatusesRouter);
app.use('/api/products', productsRouter);
app.use('/api/product-stage-links', productStageLinksRouter);
app.use('/api/stage-events', stageEventsRouter);
app.use('/api/app-data', appDataRouter);
app.use('/api/workstation', workstationRouter);
app.use('/api/ai', aiRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/workstation/data', workstationRouter);

app.get('/', (req, res) => {
  res.send('Server is running');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
