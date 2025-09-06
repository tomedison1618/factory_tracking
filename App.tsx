import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { JobsListPage } from './pages/JobsListPage';
import { CreateJobPage } from './pages/CreateJobPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ProductTravelerPage } from './pages/ProductTravelerPage';
import { ProductTypesListPage } from './pages/ProductTypesListPage';
import { ProductTypeDetailsPage } from './pages/ProductTypeDetailsPage';
import { CreateProductTypePage } from './pages/CreateProductTypePage';
import { WorkstationPage } from './pages/WorkstationPage';
import { JobKanbanPage } from './pages/JobKanbanPage';
import { PersonnelKanbanPage } from './pages/PersonnelKanbanPage';
import { ReportsPage } from './pages/ReportsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoginPage } from './pages/LoginPage';
import { Job, User, UserRole, JobAssignment, JobStageStatus, Product, ProductStageLink, StageEvent, ProductType, ProductionStage, StageEventStatus } from './types';

const getPath = () => window.location.hash.substring(1) || '/';

const App: React.FC = () => {
  const [path, setPath] = useState(getPath());
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobAssignments, setJobAssignments] = useState<JobAssignment[]>([]);
  const [jobStageStatuses, setJobStageStatuses] = useState<JobStageStatus[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStageLinks, setProductStageLinks] = useState<ProductStageLink[]>([]);
  const [stageEvents, setStageEvents] = useState<StageEvent[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productionStages, setProductionStages] = useState<ProductionStage[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/jobs')
      .then(res => res.json())
      .then(data => setJobs(data));

    fetch('http://localhost:3001/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));

    fetch('http://localhost:3001/api/production-stages')
      .then(res => res.json())
      .then(data => setProductionStages(data));

    fetch('http://localhost:3001/api/product-types')
      .then(res => res.json())
      .then(data => setProductTypes(data));

    fetch('http://localhost:3001/api/job-assignments')
      .then(res => res.json())
      .then(data => setJobAssignments(data));

    fetch('http://localhost:3001/api/job-stage-statuses')
      .then(res => res.json())
      .then(data => setJobStageStatuses(data));

    fetch('http://localhost:3001/api/products')
      .then(res => res.json())
      .then(data => setProducts(data));

    fetch('http://localhost:3001/api/product-stage-links')
      .then(res => res.json())
      .then(data => setProductStageLinks(data));

    fetch('http://localhost:3001/api/stage-events')
      .then(res => res.json())
      .then(data => setStageEvents(data));

  }, []);


  // Centralized Job Completion Logic
  useEffect(() => {
    const openJobs = jobs.filter(j => j.status === 'Open');
    if (openJobs.length === 0) return;

    const jobsToComplete = new Set<number>();

    openJobs.forEach(job => {
        const productsForJob = products.filter(p => p.jobId === job.id);
        // Only consider jobs that have products associated with them
        if (productsForJob.length > 0) {
            const allFinished = productsForJob.every(p => p.status === 'Completed' || p.status === 'Scrapped');
            if (allFinished) {
                jobsToComplete.add(job.id);
            }
        }
    });

    if (jobsToComplete.size > 0) {
        setJobs(prevJobs => {
            const needsUpdate = prevJobs.some(j => jobsToComplete.has(j.id) && j.status !== 'Completed');
            if (needsUpdate) {
                return prevJobs.map(j => jobsToComplete.has(j.id) ? { ...j, status: 'Completed' } : j);
            }
            return prevJobs;
        });
    }
  }, [products, jobs]); // Re-run whenever product or job statuses change. 

  useEffect(() => {
    const handleHashChange = () => {
      setPath(getPath());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
  const handleLogin = (username: string, password_provided: string) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.password === password_provided) {
        setCurrentUser(user);
        setLoginError(null);
        window.location.hash = '#/'; // Redirect to dashboard on successful login
    } else {
        setLoginError('Invalid username or password.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.location.hash = '#/'; // Go to login page on logout
  };

  const handleCreateNewEvent = (productStageLinkId: number, status: StageEventStatus, notes?: string, durationSeconds?: number): StageEvent => {
      const newEventId = Math.max(0, ...stageEvents.map(e => e.id)) + 1;
      const newEvent: StageEvent = {
          id: newEventId,
          productStageLinkId,
          status,
          notes,
          timestamp: new Date().toISOString(),
          userId: currentUser!.id,
          durationSeconds,
      };
      setStageEvents(prev => [...prev, newEvent]);
      return newEvent;
  }

  const handleSearchBySerial = (serialNumber: string) => {
    const product = products.find(p => p.serialNumber.toLowerCase() === serialNumber.toLowerCase());
    if (!product) {
        alert(`Product with serial number "${serialNumber}" not found.`);
        return;
    }

    // Find the latest "PENDING" event for this product to determine its current stage. 
    const productLinks = productStageLinks.filter(l => l.productId === product.id);
    const linkIds = productLinks.map(l => l.id);
    const latestPendingEvent = stageEvents
        .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.PENDING)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestPendingEvent) {
        alert(`Product "${serialNumber}" is not currently pending at any stage.`);
        return;
    }

    const currentLink = productLinks.find(l => l.id === latestPendingEvent.productStageLinkId)!;
    const currentStageId = currentLink.productionStageId;
    
    // Access Control Check
    const isAssigned = jobAssignments.some(a => 
        a.jobId === product.jobId && 
        a.productionStageId === currentStageId && 
        a.userId === currentUser!.id
    );

    const isManagerOrAdmin = currentUser!.role === UserRole.MANAGER || currentUser!.role === UserRole.ADMIN;

    if (!isAssigned && !isManagerOrAdmin) {
        alert(`Access Denied. You are not assigned to the current stage for this job.`);
        return;
    }

    // Navigate to workstation
    window.location.hash = `#/workstation/stage/${currentStageId}/job/${product.jobId}`;
  };
  
  const handleSearchForTraveler = (serialNumber: string) => {
    const product = products.find(p => p.serialNumber.toLowerCase() === serialNumber.toLowerCase());
    if (product) {
      window.location.hash = `#/products/${product.id}/traveler`;
    } else {
      alert(`Product with serial number "${serialNumber}" not found.`);
    }
  };

  const handleStartWork = (productIds: number[], stageId: number) => {
      const startedProductIds = new Set(productIds);
      const newStartedEvents: Omit<StageEvent, 'id'>[] = [];
      const pendingEventIdsToRemove = new Set<number>();

      // Step 1: Determine all changes needed based on current state, without mutating. 
      for (const productId of productIds) {
          const link = productStageLinks.find(l => l.productId === productId && l.productionStageId === stageId);
          if (link) {
              const pendingEvent = stageEvents.find(e => e.productStageLinkId === link.id && e.status === StageEventStatus.PENDING);
              if (pendingEvent) {
                  pendingEventIdsToRemove.add(pendingEvent.id);
              }
              newStartedEvents.push({
                  productStageLinkId: link.id,
                  status: StageEventStatus.STARTED,
                  timestamp: new Date().toISOString(),
                  userId: currentUser!.id,
                  durationSeconds: Math.floor(Math.random() * (900 - 300 + 1) + 300) // Mock duration
              });
          }
      }

      // Step 2: Queue the state updates. They will be based on the latest state when processed by React. 
      
      // Update products to 'In Progress'
      setProducts(prevProducts => prevProducts.map(p => {
          if (startedProductIds.has(p.id)) {
              return { ...p, status: 'In Progress', currentWorkerId: currentUser!.id };
          }
          return p;
      }));

      // Update events: remove old PENDING, add new STARTED
      setStageEvents(prevEvents => {
          // First, filter out the old events
          const updatedEvents = prevEvents.filter(e => !pendingEventIdsToRemove.has(e.id));
          
          // Then, add the new events with correct IDs
          let maxEventId = updatedEvents.length > 0 ? Math.max(...updatedEvents.map(e => e.id)) : 0;
          const eventsToAdd = newStartedEvents.map(e => ({
              ...e,
              id: ++maxEventId,
          }));
          
          return [...updatedEvents, ...eventsToAdd];
      });
  };

  const handlePassProducts = (productIds: number[], stageId: number) => {
    if (productIds.length === 0) return;

    const firstProduct = products.find(p => p.id === productIds[0]);
    if (!firstProduct) return;

    const job = jobs.find(j => j.id === firstProduct.jobId);
    if (!job) return;

    const stagesForProduct = productionStages
        .filter(s => s.productTypeId === job.productType.id)
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const currentStageIndex = stagesForProduct.findIndex(s => s.id === stageId);
    if (currentStageIndex === -1) return;

    const isLastStage = currentStageIndex === stagesForProduct.length - 1;
    const nextStage = isLastStage ? null : stagesForProduct[currentStageIndex + 1];

    // Create a transaction of state changes to apply together
    let newEvents = [...stageEvents];
    let newProducts = [...products];
    let newJobStageStatuses = [...jobStageStatuses];
    let newJobs = [...jobs];

    // 1. Update Events
    let maxEventId = Math.max(0, ...newEvents.map(e => e.id));
    const eventsToAdd: StageEvent[] = [];
    productIds.forEach(productId => {
        const currentLink = productStageLinks.find(l => l.productId === productId && l.productionStageId === stageId);
        if (currentLink) {
            eventsToAdd.push({
                id: ++maxEventId,
                productStageLinkId: currentLink.id,
                status: StageEventStatus.PASSED,
                timestamp: new Date().toISOString(),
                userId: currentUser!.id,
            });
        }
        if (nextStage) {
            const nextLink = productStageLinks.find(l => l.productId === productId && l.productionStageId === nextStage.id);
            if (nextLink) {
                eventsToAdd.push({
                    id: ++maxEventId,
                    productStageLinkId: nextLink.id,
                    status: StageEventStatus.PENDING,
                    timestamp: new Date().toISOString(),
                    userId: currentUser!.id,
                });
            }
        }
    });
    newEvents.push(...eventsToAdd);

    // 2. Update Product Status
    const passedProductIds = new Set(productIds);
    newProducts = newProducts.map(p => {
        if (passedProductIds.has(p.id)) {
            return {
                ...p,
                status: isLastStage ? 'Completed' : 'Pending',
                currentWorkerId: undefined,
            };
        }
        return p;
    });

    // 3. Update Job Stage Statuses
    newJobStageStatuses = newJobStageStatuses.map(s => {
        // Find and update current stage
        if (s.jobId === job.id && s.productionStageId === stageId) {
            const newPassedCount = s.passedCount + productIds.length;
            const didStageComplete = newPassedCount + s.scrappedCount >= job.quantity;
            return {
                ...s,
                passedCount: newPassedCount,
                status: didStageComplete ? 'Completed' : s.status,
            };
        }
        // Find and update next stage
        if (nextStage && s.jobId === job.id && s.productionStageId === nextStage.id) {
            if (s.status === 'Pending') {
                 return { ...s, status: 'In Progress' };
            }
        }
        return s;
    });

    // 4. Determine the new currentStageId for the job based on the updated statuses
    const updatedStatusesForJob = newJobStageStatuses.filter(s => s.jobId === job.id);
    const inProgressStages = updatedStatusesForJob
        .filter(s => s.status === 'In Progress')
        .map(s => stagesForProduct.find(stage => stage.id === s.productionStageId)!) // Use '!' assuming stage will always be found
        .filter(Boolean) // Filter out any potential nulls if the assumption is wrong
        .sort((a, b) => b.sequenceOrder - a.sequenceOrder);

    let newCurrentStageId = job.currentStageId;
    if (inProgressStages.length > 0) {
        newCurrentStageId = inProgressStages[0].id;
    } else { // Fallback if nothing is in progress: find the first pending stage
        const pendingStages = updatedStatusesForJob
            .filter(s => s.status === 'Pending')
            .map(s => stagesForProduct.find(stage => stage.id === s.productionStageId)!) // Use '!' assuming stage will always be found
            .filter(Boolean) // Filter out any potential nulls
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        if (pendingStages.length > 0) {
            newCurrentStageId = pendingStages[0].id;
        }
    }
    
    // 5. Update the Job
    newJobs = newJobs.map(j => 
        j.id === job.id ? { ...j, currentStageId: newCurrentStageId } : j
    );

    // 6. Commit all state changes
    setStageEvents(newEvents);
    setProducts(newProducts);
    setJobStageStatuses(newJobStageStatuses);
    setJobs(newJobs);
  };
  
  const handleFailProduct = (productId: number, stageId: number, notes: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const link = productStageLinks.find(l => l.productId === productId && l.productionStageId === stageId);
        if(!link) return;
        
        handleCreateNewEvent(link.id, StageEventStatus.FAILED, notes);
        
        // Set product status to Failed, awaiting review
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'Failed', currentWorkerId: undefined } : p));
        
        // Update the failed count for the JobStageStatus
        setJobStageStatuses(prevStatuses => prevStatuses.map(s => {
            if (s.jobId === product.jobId && s.productionStageId === stageId) {
                return { ...s, failedCount: s.failedCount + 1 };
            }
            return s;
        }));
  };

  const handleReworkProduct = (productId: number) => {
    const product = products.find(p => p.id === productId)!;
    const job = jobs.find(j => j.id === product.jobId)!;
    
    const linksForProduct = productStageLinks.filter(l => l.productId === productId);
    const linkIds = linksForProduct.map(l => l.id);
    
    const latestFailedEvent = stageEvents
        .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.FAILED)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestFailedEvent) return; 

    const failedLink = linksForProduct.find(l => l.id === latestFailedEvent.productStageLinkId)!;
    const failedStageId = failedLink.productionStageId;

    const stagesForProduct = productionStages.filter(s => s.productTypeId === job.productType.id).sort((a,b) => a.sequenceOrder - b.sequenceOrder);
    const failedStageIndex = stagesForProduct.findIndex(s => s.id === failedStageId);

    if (failedStageIndex === 0) {
        alert("Cannot rework at a previous stage because this is the first stage.");
        return;
    }

    const previousStage = stagesForProduct[failedStageIndex - 1];
    const previousStageLink = productStageLinks.find(l => l.productId === productId && l.productionStageId === previousStage.id)!;
    
    handleCreateNewEvent(failedLink.id, StageEventStatus.RESET, `Reworking at previous stage: ${previousStage.stageName}`);
    handleCreateNewEvent(previousStageLink.id, StageEventStatus.PENDING);

    // Update product status back to Pending
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'Pending' } : p));
    
    // Decrement failed count for the stage it failed at
    setJobStageStatuses(prev => prev.map(s => {
        if (s.jobId === product.jobId && s.productionStageId === failedStageId) {
            return { ...s, failedCount: s.failedCount > 0 ? s.failedCount - 1 : 0 };
        }
        return s;
    }));
  };

  const handleMoveProductToStage = (productId: number, targetStageId: number) => {
      const product = products.find(p => p.id === productId)!;

      const linksForProduct = productStageLinks.filter(l => l.productId === productId);
      const linkIds = linksForProduct.map(l => l.id);

      const latestFailedEvent = stageEvents
          .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.FAILED)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (!latestFailedEvent) return;

      const failedLink = linksForProduct.find(l => l.id === latestFailedEvent.productStageLinkId)!;
      const failedStageId = failedLink.productionStageId;
      const targetStageLink = productStageLinks.find(l => l.productId === productId && l.productionStageId === targetStageId)!;
      const targetStage = productionStages.find(s => s.id === targetStageId)!;
      
      handleCreateNewEvent(failedLink.id, StageEventStatus.RESET, `Manager moved product to stage: ${targetStage.stageName}`);
      handleCreateNewEvent(targetStageLink.id, StageEventStatus.PENDING);
      
      // Update product status back to Pending
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'Pending' } : p));
    
      // Decrement failed count for the stage it failed at
      setJobStageStatuses(prev => prev.map(s => {
          if (s.jobId === product.jobId && s.productionStageId === failedStageId) {
              return { ...s, failedCount: s.failedCount > 0 ? s.failedCount - 1 : 0 };
          }
          return s;
      }));
  };

  const handleScrapProduct = (productId: number, notes: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Find the current stage of the product based on its latest event of any type
    const productLinks = productStageLinks.filter(l => l.productId === productId);
    const linkIds = productLinks.map(l => l.id);

    const latestEvent = stageEvents
        .filter(e => linkIds.includes(e.productStageLinkId))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestEvent) {
        alert("Cannot scrap product: its location in the workflow is unknown (no events found).");
        return;
    }
    
    const currentLink = productLinks.find(l => l.id === latestEvent.productStageLinkId)!;
    const currentStageId = currentLink.productionStageId;

    // Create the SCRAPPED event at its current location
    handleCreateNewEvent(currentLink.id, StageEventStatus.SCRAPPED, notes);

    const wasFailed = product.status === 'Failed';

    // Update product status to Scrapped
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'Scrapped', currentWorkerId: undefined } : p));
    
    // Update the counts for the stage where it was scrapped
    setJobStageStatuses(prev => prev.map(s => {
        if (s.jobId === product.jobId && s.productionStageId === currentStageId) {
            return {
                ...s,
                failedCount: wasFailed && s.failedCount > 0 ? s.failedCount - 1 : s.failedCount,
                scrappedCount: s.scrappedCount + 1
            };
        }
        return s;
    }));
  };

  const handleCreateJob = (newJobData: Omit<Job, 'id' | 'status' | 'currentStageId' | 'assignedUserId'>) => {
    const newId = jobs.length > 0 ? Math.max(...jobs.map(j => j.id)) + 1 : 1013;
    const stagesForProductType = productionStages.filter(s => s.productTypeId === newJobData.productType.id);
    const sortedStages = [...stagesForProductType].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const firstStage = sortedStages[0];
    const firstTechnician = users.find(u => u.role === UserRole.TECHNICIAN);

    const newJob: Job = {
      ...newJobData,
      id: newId,
      status: 'Open',
      currentStageId: firstStage.id,
      assignedUserId: firstTechnician!.id,
    };
    
    setJobs(prevJobs => [...prevJobs, newJob]);
    
    // --- Auto-generate products for the new job ---
    const docketPrefix = newJob.docketNumber.split('-')[0];
    let maxProductId = Math.max(0, ...products.map(p => p.id));
    let maxLinkId = Math.max(0, ...productStageLinks.map(l => l.id));
    let maxEventId = Math.max(0, ...stageEvents.map(e => e.id));
    
    const newProducts: Product[] = [];
    const newLinks: ProductStageLink[] = [];
    const newEvents: StageEvent[] = [];

    for (let i = 1; i <= newJob.quantity; i++) {
        const newProduct: Product = {
            id: ++maxProductId,
            jobId: newJob.id,
            serialNumber: `${docketPrefix}-${i.toString().padStart(3, '0')}`,
            status: 'Pending',
        };
        newProducts.push(newProduct);

        // Create links and initial PENDING event for the first stage
        sortedStages.forEach((stage, index) => {
            const newLink: ProductStageLink = {
                id: ++maxLinkId,
                productId: newProduct.id,
                productionStageId: stage.id
            };
            newLinks.push(newLink);

            if(index === 0) {
                const newEvent: StageEvent = {
                    id: ++maxEventId,
                    productStageLinkId: newLink.id,
                    status: StageEventStatus.PENDING,
                    timestamp: new Date().toISOString(),
                    userId: currentUser!.id, // Or a system user
                };
                newEvents.push(newEvent);
            }
        });
    }
    setProducts(prevProducts => [...prevProducts, ...newProducts]);
    setProductStageLinks(prev => [...prev, ...newLinks]);
    setStageEvents(prev => [...prev, ...newEvents]);

    // --- Auto-generate job stage statuses ---
    let maxStatusId = Math.max(0, ...jobStageStatuses.map(s => s.id));
    const newStatuses: JobStageStatus[] = sortedStages.map((stage, index) => ({
      id: ++maxStatusId,
      jobId: newJob.id,
      productionStageId: stage.id,
      status: index === 0 ? 'In Progress' : 'Pending',
      passedCount: 0,
      failedCount: 0,
      scrappedCount: 0
    }));
    setJobStageStatuses(prevStatuses => [...prevStatuses, ...newStatuses]);

    window.location.hash = `#/jobs/${newId}`;
  };

  const handleUpdateAssignments = (jobId: number, productionStageId: number, userId: number, isAssigned: boolean) => {
    setJobAssignments(prev => {
      if (isAssigned) {
        // Add assignment
        const newId = Math.max(0, ...prev.map(a => a.id)) + 1;
        const newAssignment: JobAssignment = { id: newId, jobId, productionStageId, userId };
        return [...prev, newAssignment];
      } else {
        // Remove assignment
        return prev.filter(a => !(a.jobId === jobId && a.productionStageId === productionStageId && a.userId === userId));
      }
    });
  };

  const handleUpdateJobPriority = (jobId: number, priority: number) => {
    setJobs(prevJobs =>
      prevJobs.map(j => (j.id === jobId ? { ...j, priority } : j))
    );
  };
  
  const handleAddProduct = (jobId: number, serialNumber: string, status: Product['status']) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
        console.error("Job not found for adding product");
        return;
    }

    const stagesForProductType = productionStages
        .filter(s => s.productTypeId === job.productType.id)
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    
    if (stagesForProductType.length === 0) {
        console.error("No stages found for product type");
        return;
    }

    // --- Create new Product ---
    const newProductId = Math.max(0, ...products.map(p => p.id)) + 1;
    const newProduct: Product = { id: newProductId, jobId, serialNumber, status };
    
    // --- Create new ProductStageLinks ---
    let maxLinkId = Math.max(0, ...productStageLinks.map(l => l.id));
    const newLinks: ProductStageLink[] = stagesForProductType.map(stage => ({
        id: ++maxLinkId,
        productId: newProductId,
        productionStageId: stage.id,
    }));
    
    // --- Create initial StageEvent if needed ---
    const newEvents: StageEvent[] = [];
    if (status === 'Pending') {
        const firstStage = stagesForProductType[0];
        const firstStageLink = newLinks.find(l => l.productionStageId === firstStage.id);
        if (firstStageLink) {
            const newEventId = Math.max(0, ...stageEvents.map(e => e.id)) + 1;
            const newEvent: StageEvent = {
                id: newEventId,
                productStageLinkId: firstStageLink.id,
                status: StageEventStatus.PENDING,
                timestamp: new Date().toISOString(),
                userId: currentUser!.id,
            };
            newEvents.push(newEvent);
        }
    }

    setProducts(prev => [...prev, newProduct]);
    setProductStageLinks(prev => [...prev, ...newLinks]);
    setStageEvents(prev => [...prev, ...newEvents]);
  };

  const handleAddStage = (productTypeId: number, newStageData: Omit<ProductionStage, 'id' | 'productTypeId'>) => {
    setProductionStages(prev => {
      const newId = Math.max(0, ...prev.map(s => s.id)) + 1;
      const newStage: ProductionStage = {
        ...newStageData,
        id: newId,
        productTypeId,
      };
      return [...prev, newStage];
    });
  };

  const handleUpdateStage = (updatedStage: ProductionStage) => {
    setProductionStages(prev => prev.map(stage => stage.id === updatedStage.id ? updatedStage : stage));
  };

  const handleDeleteStage = (stageId: number) => {
    const completedJobUsingStage = jobs.find(job => {
        if (job.status !== 'Completed') return false;
        const stagesForJob = jobStageStatuses.filter(s => s.jobId === job.id);
        return stagesForJob.some(s => s.productionStageId === stageId);
    });

    if (completedJobUsingStage) {
        let alertMessage = `This stage cannot be deleted because it is part of the permanent workflow for at least one COMPLETED job.`;
        alertMessage += `\n\nFor example, Job "${completedJobUsingStage.docketNumber}" was completed using this stage.`;
        alertMessage += `\n\nTo protect the integrity of historical data, workflows for completed jobs are locked.`;
        
        alert(alertMessage);
        return;
    }
      
    if (window.confirm('Are you sure you want to delete this stage? This action cannot be undone.')) {
        setProductionStages(prev => prev.filter(stage => stage.id !== stageId));
    }
  };
  
  const handleBulkAddStages = (productTypeId: number, newStages: Omit<ProductionStage, 'id' | 'productTypeId'>[]) => {
    setProductionStages(prev => {
        let maxId = Math.max(0, ...prev.map(s => s.id));
        const stagesToAdd: ProductionStage[] = newStages.map(s => ({
            ...s,
            id: ++maxId,
            productTypeId,
        }));
        return [...prev, ...stagesToAdd];
    });
  };

  const handleCreateProductType = (typeName: string, partNumber: string) => {
    setProductTypes(prev => {
        const newId = Math.max(0, ...prev.map(pt => pt.id)) + 1;
        const newProductType: ProductType = { id: newId, typeName, partNumber };
        return [...prev, newProductType];
    });
    window.location.hash = '#/product-types';
  };

  const handleCreateUser = (newUser: Omit<User, 'id'>) => {
      setUsers(prev => {
          const newId = Math.max(0, ...prev.map(u => u.id)) + 1;
          return [...prev, { ...newUser, id: newId }];
      });
  };

  const handleUpdateUser = (updatedUser: User) => {
      setUsers(prev => prev.map(u => {
          if (u.id === updatedUser.id) {
              // Keep the old password if a new one isn't provided
              const password = updatedUser.password ? updatedUser.password : u.password;
              return { ...updatedUser, password };
          }
          return u;
      }));
  };

  const handleDeleteUser = (userId: number) => {
      const isAssignedToJob = jobAssignments.some(a => a.userId === userId);
      const isWorkingOnProduct = products.some(p => p.currentWorkerId === userId);

      if (isAssignedToJob || isWorkingOnProduct) {
          alert('This user cannot be deleted because they are assigned to active work. Please reassign their work before deleting.');
          return;
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
  };


  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  const renderPage = () => {
    const parts = path.split('?')[0].split('/').filter(Boolean);
    
    if (parts[0] === 'ai-assistant') {
        return <AIAssistantPage 
                    jobs={jobs}
                    products={products}
                    stageEvents={stageEvents}
                    productionStages={productionStages}
                    users={users}
                    productStageLinks={productStageLinks}
                />;
    }
    
    if (parts[0] === 'users') {
        return <UserManagementPage 
                    users={users}
                    currentUser={currentUser}
                    onCreateUser={handleCreateUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                />;
    }

    if (parts[0] === 'workstation' && parts[1] === 'stage' && parts[3] === 'job') {
        const stageId = parseInt(parts[2], 10);
        const jobId = parseInt(parts[4], 10);
        const job = jobs.find(j => j.id === jobId);
        const stage = productionStages.find(s => s.id === stageId);

        if (job && stage) {
            const productsForJob = products.filter(p => p.jobId === jobId);
            return <WorkstationPage
                        job={job}
                        stage={stage}
                        products={productsForJob}
                        currentUser={currentUser}
                        stageEvents={stageEvents}
                        productStageLinks={productStageLinks}
                        onStartWork={handleStartWork}
                        onPassProducts={handlePassProducts}
                        onFailProduct={handleFailProduct}
                    />
        }
    }
    
    if (parts[0] === 'kanban') {
        if (parts[1] === 'jobs') {
            return <JobKanbanPage jobs={jobs} productionStages={productionStages} users={users} products={products} productStageLinks={productStageLinks} stageEvents={stageEvents} jobAssignments={jobAssignments} />;
        }
        if (parts[1] === 'personnel') {
            return <PersonnelKanbanPage jobs={jobs} productionStages={productionStages} users={users} products={products} productStageLinks={productStageLinks} stageEvents={stageEvents} jobAssignments={jobAssignments} />;
        }
    }

    if (parts[0] === 'reports') {
        return <ReportsPage 
            jobs={jobs}
            products={products}
            stageEvents={stageEvents}
            productStageLinks={productStageLinks}
            users={users}
            productionStages={productionStages}
            productTypes={productTypes}
        />;
    }

    if (parts[0] === 'jobs') {
      if (parts[1] === 'new') {
        return <CreateJobPage productTypes={productTypes} onCreateJob={handleCreateJob} jobs={jobs} />;
      }
      if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
        const jobId = parseInt(parts[1], 10);
        const job = jobs.find(j => j.id === jobId);
        if (job) {
          const assignmentsForJob = jobAssignments.filter(a => a.jobId === jobId);
          const statusesForJob = jobStageStatuses.filter(s => s.jobId === jobId);
          const productsForJob = products.filter(p => p.jobId === jobId);
          const stagesForJob = productionStages.filter(s => s.productTypeId === job.productType.id);
          return <JobDetailsPage 
                    job={job} 
                    users={users} 
                    productionStages={stagesForJob}
                    jobAssignments={assignmentsForJob}
                    jobStageStatuses={statusesForJob}
                    products={productsForJob}
                    onUpdateAssignments={handleUpdateAssignments}
                    onAddProduct={handleAddProduct}
                    currentUser={currentUser}
                    stageEvents={stageEvents}
                    productStageLinks={productStageLinks}
                    onReworkProduct={handleReworkProduct}
                    onMoveProductToStage={handleMoveProductToStage}
                    onScrapProduct={handleScrapProduct}
                    onUpdateJobPriority={handleUpdateJobPriority}
                 />;
        } else {
           window.location.hash = '#/jobs';
           return <JobsListPage jobs={jobs} />;
        }
      }
      return <JobsListPage jobs={jobs} />;
    }

    if (parts[0] === 'products' && parts[2] === 'traveler' && !isNaN(parseInt(parts[1]))) {
        const productId = parseInt(parts[1], 10);
        const product = products.find(p => p.id === productId);
        if (product) {
            const jobForProduct = jobs.find(j => j.id === product.jobId);
            if (jobForProduct) {
                const stagesForProductType = productionStages.filter(s => s.productTypeId === jobForProduct.productType.id);
                const linksForProduct = productStageLinks.filter(l => l.productId === productId);
                const linkIds = linksForProduct.map(l => l.id);
                const eventsForProduct = stageEvents.filter(e => linkIds.includes(e.productStageLinkId));
                return <ProductTravelerPage
                            product={product}
                            events={eventsForProduct}
                            links={linksForProduct}
                            stages={stagesForProductType}
                            users={users}
                       />;
            }
        }
    }

    if (parts[0] === 'product-types') {
        if (parts[1] === 'new') {
            return <CreateProductTypePage onCreateProductType={handleCreateProductType} />;
        }
        if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
            const typeId = parseInt(parts[1], 10);
            const productType = productTypes.find(pt => pt.id === typeId);
            if (productType) {
                const stagesForType = productionStages.filter(s => s.productTypeId === typeId);
                return <ProductTypeDetailsPage 
                            productType={productType} 
                            stages={stagesForType}
                            jobs={jobs}
                            onAddStage={handleAddStage}
                            onUpdateStage={handleUpdateStage}
                            onDeleteStage={handleDeleteStage}
                            onBulkAddStages={handleBulkAddStages}
                        />;
            }
        } else {
            window.location.hash = '#/product-types';
            return <ProductTypesListPage productTypes={productTypes} />;
        }
        return <ProductTypesListPage productTypes={productTypes} />;
    }
    
    return <DashboardPage 
                jobs={jobs} 
                productionStages={productionStages} 
                users={users} 
                onSearch={handleSearchBySerial}
                currentUser={currentUser}
                products={products}
                jobAssignments={jobAssignments}
                stageEvents={stageEvents}
                productStageLinks={productStageLinks}
                jobStageStatuses={jobStageStatuses}
                onReworkProduct={handleReworkProduct}
                onMoveProductToStage={handleMoveProductToStage}
                onScrapProduct={handleScrapProduct}
            />;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <Header 
        currentPath={path} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        onSearchForTraveler={handleSearchForTraveler}
       />
      <div className="flex-grow overflow-hidden">
        {renderPage()}
      </div>
    </div>
  );
};

export default App;
