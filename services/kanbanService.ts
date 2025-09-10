
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
    stage: ProductionStage,
    quantity: number,
    isWorking: boolean // Flag to determine text
): KanbanCardData => {
  const quantityText = isWorking
    ? `(Working on: ${quantity})`
    : `(${quantity} items available)`;

  return {
    id: `${job.id}-${userForCard.id}-${stage.id}`,
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
    // Map of workerId to the stage they are working on for this job.
    const activeWork = new Map<number, { stage: ProductionStage, quantity: number }>();

    const inProgressProducts = products.filter(p => p.jobId === job.id && p.status === 'In Progress' && p.currentWorkerId != null);

    for (const product of inProgressProducts) {
        const workerId = product.currentWorkerId!;
        const productLinks = productStageLinks.filter(l => l.productId === product.id);
        const linkIds = new Set(productLinks.map(l => l.id));
        const latestStartedEvent = stageEvents
            .filter(e => linkIds.has(e.productStageLinkId) && e.status === StageEventStatus.STARTED)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (latestStartedEvent) {
            const link = productLinks.find(l => l.id === latestStartedEvent.productStageLinkId);
            if (link) {
                const stage = stages.find(s => s.id === link.productionStageId);
                if (stage) {
                    if (activeWork.has(workerId)) {
                        activeWork.get(workerId)!.quantity++;
                    } else {
                        activeWork.set(workerId, { stage, quantity: 1 });
                    }
                }
            }
        }
    }

    activeWork.forEach(({ stage, quantity }, workerId) => {
        const column = columnMap.get(workerId);
        const worker = users.find(u => u.id === workerId);
        if (column && worker) {
            column.cards.push(createKanbanCard(job, worker, stage, quantity, true));
        }
    });


    // Idle work
    const productsByStage = getProductsByStageForJob(job.id, products, productStageLinks, stageEvents);

    productsByStage.forEach((productsAtStage, stageId) => {
        const assignmentsForStage = jobAssignments.filter(
            a => a.jobId === job.id && a.productionStageId === stageId
        );
        const quantity = productsAtStage.length;

        if (quantity > 0) {
            assignmentsForStage.forEach(assignment => {
                // Avoid creating idle card if user is already actively working on this job
                if (activeWork.has(assignment.userId)) return;

                const column = columnMap.get(assignment.userId);
                const assignedUser = users.find(u => u.id === assignment.userId);
                const stage = stages.find(s => s.id === stageId);

                if (column && assignedUser && stage) {
                    column.cards.push(createKanbanCard(job, assignedUser, stage, quantity, false));
                }
            });
        }
    });
  });

  // Sort cards within each column by priority and then by stage sequence
  columns.forEach(column => {
    column.cards.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.stage.sequenceOrder - b.stage.sequenceOrder
    });
  });

  return columns;
};
