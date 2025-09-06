import { User, ProductionStage, ProductType, Job, UserRole, JobAssignment, JobStageStatus, Product, ProductStageLink, StageEvent, StageEventStatus } from '../types';

// Unchanged data
export const users: User[] = [
  { id: 1, username: 'Alice', role: UserRole.TECHNICIAN, password: 'password123' },
  { id: 2, username: 'Bob', role: UserRole.TECHNICIAN, password: 'password123' },
  { id: 3, username: 'Charlie', role: UserRole.TECHNICIAN, password: 'password123' },
  { id: 4, username: 'Diana', role: UserRole.MANAGER, password: 'password123' },
  { id: 5, username: 'admin', role: UserRole.ADMIN, password: 'admin' },
];

export const productTypes: ProductType[] = [
  { id: 1, typeName: 'Model A Widget', partNumber: 'WDG-A-001' },
  { id: 2, typeName: 'Model B Gadget', partNumber: 'GDG-B-001' },
];

export const productionStages: ProductionStage[] = [
  // Stages for Model A Widget (Type 1)
  { id: 101, productTypeId: 1, stageName: 'Component Prep', sequenceOrder: 1, description: 'Prepare and verify all components.', instruction_file: '/instructions/prep.pdf' },
  { id: 102, productTypeId: 1, stageName: 'Sub-Assembly', sequenceOrder: 2, description: 'Assemble the core sub-unit.', instruction_file: '/instructions/sub-assembly.html' },
  { id: 103, productTypeId: 1, stageName: 'Main Assembly', sequenceOrder: 3, description: 'Integrate sub-unit into the main chassis.' },
  { id: 104, productTypeId: 1, stageName: 'Quality Assurance', sequenceOrder: 4, description: 'Perform full diagnostic and quality checks.', instruction_file: '/instructions/qa-checklist.pdf' },
  { id: 105, productTypeId: 1, stageName: 'Packaging', sequenceOrder: 5, description: 'Package final product for shipment.' },
  { id: 106, productTypeId: 1, stageName: 'Ready for Shipment', sequenceOrder: 6, description: 'Awaiting courier pickup.' },

  // Stages for Model B Gadget (Type 2)
  { id: 201, productTypeId: 2, stageName: 'Housing Prep', sequenceOrder: 1, description: 'Prepare and clean the outer housing.' },
  { id: 202, productTypeId: 2, stageName: 'Electronics Install', sequenceOrder: 2, description: 'Install and solder electronic components.' },
  { id: 203, productTypeId: 2, stageName: 'Firmware Flash', sequenceOrder: 3, description: 'Flash the latest firmware version.' },
  { id: 204, productTypeId: 2, stageName: 'Final Testing', sequenceOrder: 4, description: 'Run final system-level tests.' },
  { id: 205, productTypeId: 2, stageName: 'Packaging', sequenceOrder: 5, description: 'Package final product for shipment.' },
];

// --- SIMPLIFIED DATA FOR TESTING ---

export const jobs: Job[] = [
  { id: 1001, docketNumber: '8101-01', quantity: 4, priority: 1, dueDate: '2024-08-15', status: 'Open', productType: productTypes[0], currentStageId: 101, assignedUserId: 1 },
  { id: 1002, docketNumber: '8102-01', quantity: 3, priority: 3, dueDate: '2024-08-20', status: 'Open', productType: productTypes[1], currentStageId: 201, assignedUserId: 3 },
  { id: 1003, docketNumber: '8201-01', quantity: 10, priority: 2, dueDate: '2024-09-01', status: 'Open', productType: productTypes[0], currentStageId: 101, assignedUserId: 1 },
  { id: 1012, docketNumber: '8302-01', quantity: 2, priority: 3, dueDate: '2024-08-01', status: 'Completed', productType: productTypes[1], currentStageId: 205, assignedUserId: 3 },
];

export const products: Product[] = [
  // Job 1001 (Open) - All Pending at Stage 1
  { id: 2001, jobId: 1001, serialNumber: '8101-001', status: 'Pending' },
  { id: 2002, jobId: 1001, serialNumber: '8101-002', status: 'Pending' },
  { id: 2003, jobId: 1001, serialNumber: '8101-003', status: 'Pending' },
  { id: 2004, jobId: 1001, serialNumber: '8101-004', status: 'Pending' },
  
  // Job 1002 (Open) - All Pending at Stage 1
  { id: 2051, jobId: 1002, serialNumber: '8102-001', status: 'Pending' },
  { id: 2052, jobId: 1002, serialNumber: '8102-002', status: 'Pending' },
  { id: 2053, jobId: 1002, serialNumber: '8102-003', status: 'Pending' },

  // Job 1012 (Completed)
  { id: 3001, jobId: 1012, serialNumber: '8302-001', status: 'Completed' },
  { id: 3002, jobId: 1012, serialNumber: '8302-002', status: 'Completed' },

  // Job 1003 (New, Open) - All Pending at Stage 1
  { id: 4001, jobId: 1003, serialNumber: '8201-001', status: 'Pending' },
  { id: 4002, jobId: 1003, serialNumber: '8201-002', status: 'Pending' },
  { id: 4003, jobId: 1003, serialNumber: '8201-003', status: 'Pending' },
  { id: 4004, jobId: 1003, serialNumber: '8201-004', status: 'Pending' },
  { id: 4005, jobId: 1003, serialNumber: '8201-005', status: 'Pending' },
  { id: 4006, jobId: 1003, serialNumber: '8201-006', status: 'Pending' },
  { id: 4007, jobId: 1003, serialNumber: '8201-007', status: 'Pending' },
  { id: 4008, jobId: 1003, serialNumber: '8201-008', status: 'Pending' },
  { id: 4009, jobId: 1003, serialNumber: '8201-009', status: 'Pending' },
  { id: 4010, jobId: 1003, serialNumber: '8201-010', status: 'Pending' },
];

export const jobAssignments: JobAssignment[] = [
    // Job 1001 Assignments (Model A)
    { id: 1, jobId: 1001, userId: 1, productionStageId: 101 }, // Alice on Prep
    { id: 2, jobId: 1001, userId: 2, productionStageId: 101 }, // Bob on Prep
    { id: 3, jobId: 1001, userId: 1, productionStageId: 102 }, // Alice on Sub-Assembly
  
    // Job 1002 Assignments (Model B)
    { id: 6, jobId: 1002, userId: 3, productionStageId: 201 }, // Charlie on Housing Prep
    { id: 7, jobId: 1002, userId: 2, productionStageId: 202 }, // Bob on Electronics

    // Job 1003 Assignments (Model A) - Make it visible on Personnel board
    { id: 8, jobId: 1003, userId: 1, productionStageId: 101 }, // Alice on Prep
];

export const jobStageStatuses: JobStageStatus[] = [
    // Job 1001 (Open) - Reset to start
    { id: 1, jobId: 1001, productionStageId: 101, status: 'In Progress', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 2, jobId: 1001, productionStageId: 102, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 3, jobId: 1001, productionStageId: 103, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 4, jobId: 1001, productionStageId: 104, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 5, jobId: 1001, productionStageId: 105, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 6, jobId: 1001, productionStageId: 106, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    
    // Job 1002 (Open) - Reset to start
    { id: 7, jobId: 1002, productionStageId: 201, status: 'In Progress', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 8, jobId: 1002, productionStageId: 202, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 9, jobId: 1002, productionStageId: 203, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 10, jobId: 1002, productionStageId: 204, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 11, jobId: 1002, productionStageId: 205, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },

    // Job 1012 (Completed)
    { id: 12, jobId: 1012, productionStageId: 201, status: 'Completed', passedCount: 2, failedCount: 0, scrappedCount: 0 },
    { id: 13, jobId: 1012, productionStageId: 202, status: 'Completed', passedCount: 2, failedCount: 0, scrappedCount: 0 },
    { id: 14, jobId: 1012, productionStageId: 203, status: 'Completed', passedCount: 2, failedCount: 0, scrappedCount: 0 },
    { id: 15, jobId: 1012, productionStageId: 204, status: 'Completed', passedCount: 2, failedCount: 0, scrappedCount: 0 },
    { id: 16, jobId: 1012, productionStageId: 205, status: 'Completed', passedCount: 2, failedCount: 0, scrappedCount: 0 },

    // Job 1003 (New, Open)
    { id: 17, jobId: 1003, productionStageId: 101, status: 'In Progress', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 18, jobId: 1003, productionStageId: 102, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 19, jobId: 1003, productionStageId: 103, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 20, jobId: 1003, productionStageId: 104, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 21, jobId: 1003, productionStageId: 105, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
    { id: 22, jobId: 1003, productionStageId: 106, status: 'Pending', passedCount: 0, failedCount: 0, scrappedCount: 0 },
];

// Generate Links for all products and stages
const allProductStageLinks: ProductStageLink[] = [];
let linkIdCounter = 5000;
products.forEach(p => {
    const job = jobs.find(j => j.id === p.jobId)!;
    const stagesForProduct = productionStages.filter(s => s.productTypeId === job.productType.id);
    stagesForProduct.forEach(s => {
        allProductStageLinks.push({
            id: ++linkIdCounter,
            productId: p.id,
            productionStageId: s.id,
        });
    });
});
export const productStageLinks: ProductStageLink[] = allProductStageLinks;


// Generate Events for the simplified data
const allStageEvents: StageEvent[] = [];
let eventIdCounter = 1;

// 1. Create PENDING events for all open jobs at their first stage
products.filter(p => p.status === 'Pending').forEach(p => {
    const job = jobs.find(j => j.id === p.jobId)!;
    const firstStage = productionStages
        .filter(s => s.productTypeId === job.productType.id)
        .sort((a,b) => a.sequenceOrder - b.sequenceOrder)[0];
    
    const link = productStageLinks.find(l => l.productId === p.id && l.productionStageId === firstStage.id)!;

    allStageEvents.push({
        id: ++eventIdCounter,
        productStageLinkId: link.id,
        status: StageEventStatus.PENDING,
        timestamp: new Date().toISOString(),
        userId: 4, // System/Manager
    });
});

// 2. Create a plausible history for the COMPLETED job's products
products.filter(p => p.status === 'Completed').forEach(p => {
    const job = jobs.find(j => j.id === p.jobId)!;
    const stagesForProduct = productionStages
        .filter(s => s.productTypeId === job.productType.id)
        .sort((a,b) => a.sequenceOrder - b.sequenceOrder);
    
    stagesForProduct.forEach(s => {
        const link = productStageLinks.find(l => l.productId === p.id && l.productionStageId === s.id)!;
        // Started Event
        allStageEvents.push({
            id: ++eventIdCounter,
            productStageLinkId: link.id,
            status: StageEventStatus.STARTED,
            timestamp: '2024-07-20T10:00:00Z',
            userId: 3,
            durationSeconds: 300,
        });
        // Passed Event
        allStageEvents.push({
            id: ++eventIdCounter,
            productStageLinkId: link.id,
            status: StageEventStatus.PASSED,
            timestamp: '2024-07-20T10:05:00Z',
            userId: 3,
        });
    });
});

export const stageEvents: StageEvent[] = allStageEvents;