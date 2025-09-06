
import { Job, ProductionStage, User, KanbanColumnData, KanbanCardData, UserRole, Product, StageEvent, ProductStageLink, StageEventStatus, JobAssignment } from '../types';

/**
 * Accurately determines the location of all products for a given job.
 * A product's location is the stage of its most recent PENDING, STARTED, or FAILED event.
 * @returns A Map where keys are stage IDs and values are arrays of products at that stage.
 */
export const getProductsByStageForJob = (
    jobId: number,
    allProducts: Product[],
    allLinks: ProductStageLink[],
    allEvents: StageEvent[]
): Map<number, Product[]> => {
    // Filter for products that are part of the job and are not in a final state.
    const productsForJob = allProducts.filter(p => p.jobId === jobId && p.status !== 'Completed' && p.status !== 'Scrapped');
    const result = new Map<number, Product[]>();

    for (const product of productsForJob) {
        // Create a map of this product's link IDs to stage IDs for quick lookup.
        const productLinks = allLinks.filter(l => l.productId === product.id);
        const linkIdToStageIdMap = new Map<number, number>(productLinks.map(l => [l.id, l.productionStageId]));
        const productLinkIds = new Set(productLinks.map(l => l.id));

        // Get all events for this product, sorted from newest to oldest.
        const eventsForProduct = allEvents
            .filter(e => productLinkIds.has(e.productStageLinkId))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Find the most recent event that defines the product's location.
        // These are events that mean "the product is currently at this stage".
        const locationDefiningEvent = eventsForProduct.find(e =>
            e.status === StageEventStatus.PENDING ||
            e.status === StageEventStatus.STARTED ||
            e.status === StageEventStatus.FAILED
        );
        
        if (locationDefiningEvent) {
            // Get the stage ID from the event's link.
            const stageId = linkIdToStageIdMap.get(locationDefiningEvent.productStageLinkId);
            if (stageId) {
                // Add the product to the map for that stage.
                if (!result.has(stageId)) {
                    result.set(stageId, []);
                }
                result.get(stageId)!.push(product);
            }
        }
    }
    return result;
};


// Helper to create a card. Now accepts a flag to show clearer quantity text.
export const createKanbanCard = (
    job: Job,
    userForCard: User,
    allStages: ProductionStage[],
    quantity: number,
    isWorking: boolean // Flag to determine text
): KanbanCardData => {
  const stage = allStages.find(s => s.id === job.currentStageId);

  if (!stage) {
    throw new Error(`Could not find stage for job ${job.docketNumber}`);
  }

  const quantityText = isWorking
    ? `(Working on: ${quantity})`
    : `(${quantity} items available)`;

  return {
    id: `${job.id}-${userForCard.id}`,
    title: job.docketNumber,
    content: `Product: ${job.productType.typeName} ${quantityText}`,
    priority: job.priority,
    dueDate: job.dueDate,
    user: userForCard,
    stage,
  };
};

// Finds unique user IDs of those actively working on a job by checking 'In Progress' products.
export const getActiveWorkerIdsForJob = (job: Job, allProducts: Product[]): number[] => {
    const productsForJob = allProducts.filter(p => p.jobId === job.id);
    const inProgressProducts = productsForJob.filter(p => p.status === 'In Progress' && p.currentWorkerId != null);
    const workerIds = inProgressProducts.map(p => p.currentWorkerId!);
    return [...new Set(workerIds)];
};

export const getPersonnelCentricData = (
    jobs: Job[], 
    stages: ProductionStage[], 
    users: User[], 
    products: Product[], 
    productStageLinks: ProductStageLink[], 
    stageEvents: StageEvent[],
    jobAssignments: JobAssignment[]
): KanbanColumnData[] => {
  const relevantUsers = users.filter(u => u.role === UserRole.TECHNICIAN);

  const columns: KanbanColumnData[] = relevantUsers.map(user => ({
    id: String(user.id),
    title: user.username,
    cards: [],
  }));

  const columnMap = new Map<number, KanbanColumnData>(columns.map(col => [Number(col.id), col]));

  jobs.filter(j => j.status === 'Open').forEach(job => {
    const activeWorkerIds = getActiveWorkerIdsForJob(job, products);

    if (activeWorkerIds.length > 0) {
        // Active work
        activeWorkerIds.forEach(workerId => {
            const column = columnMap.get(workerId);
            const worker = users.find(u => u.id === workerId);
            if (column && worker) {
                const quantity = products.filter(p => p.jobId === job.id && p.status === 'In Progress' && p.currentWorkerId === workerId).length;
                column.cards.push(createKanbanCard(job, worker, stages, quantity, true));
            }
        });
    } else {
        // Idle work
        const assignmentsForStage = jobAssignments.filter(
            a => a.jobId === job.id && a.productionStageId === job.currentStageId
        );

        if (assignmentsForStage.length > 0) {
            const productsByStage = getProductsByStageForJob(job.id, products, productStageLinks, stageEvents);
            const quantity = productsByStage.get(job.currentStageId)?.length || 0;

            if (quantity > 0) {
                assignmentsForStage.forEach(assignment => {
                    const column = columnMap.get(assignment.userId);
                    const assignedUser = users.find(u => u.id === assignment.userId);

                    if (column && assignedUser) {
                        column.cards.push(createKanbanCard(job, assignedUser, stages, quantity, false));
                    }
                });
            }
        }
    }
  });
  
  // Sort cards within each column by stage sequence
  columns.forEach(column => {
    column.cards.sort((a, b) => a.stage.sequenceOrder - b.stage.sequenceOrder);
  });

  return columns;
};
