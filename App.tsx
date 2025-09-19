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
import { Job, User, UserRole, JobAssignment, JobStageStatus, Product, ProductStageLink, StageEvent, ProductType, ProductionStage, StageEventStatus, CreateJobRequest } from './types';

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

  const [isLoading, setIsLoading] = useState(true);

  const fetchAppData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/app-data');
      const data = await response.json();
      setJobs(data.jobs);
      setUsers(data.users);
      setProductionStages(data.productionStages);
      setProductTypes(data.productTypes);
      setJobAssignments(data.jobAssignments);
      setJobStageStatuses(data.jobStageStatuses);
      setProducts(data.products);
      setProductStageLinks(data.productStageLinks);
      setStageEvents(data.stageEvents);
    } catch (error) {
      console.error("Failed to fetch app data", error);
      // Handle error appropriately, maybe show a global error message
    } finally {
      setIsLoading(false);
    }
  };

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
  
  const handleLogin = async (username: string, password_provided: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username, password: password_provided }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setLoginError(null);
        setIsLoading(true);
        await fetchAppData();
        window.location.hash = '#/'; // Redirect to dashboard on successful login
      } else {
        const errorText = await response.text();
        setLoginError(errorText || 'Invalid username or password.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError('An unexpected error occurred. Please try again.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    // Clear all data on logout
    setJobs([]);
    setUsers([]);
    setProductionStages([]);
    setProductTypes([]);
    setJobAssignments([]);
    setJobStageStatuses([]);
    setProducts([]);
    setProductStageLinks([]);
    setStageEvents([]);
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

  const handleStartWork = async (productIds: number[], stageId: number) => {
    try {
      const response = await fetch('http://localhost:3001/api/workstation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds, stageId, userId: currentUser!.id }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to start work: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to start work:', error);
      alert('An unexpected error occurred while starting work.');
    }
  };

  const handlePassProducts = async (productIds: number[], stageId: number) => {
    try {
      const response = await fetch('http://localhost:3001/api/workstation/pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds, stageId, userId: currentUser!.id }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to pass products: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to pass products:', error);
      alert('An unexpected error occurred while passing products.');
    }
  };
  
  const handleFailProduct = async (productId: number, stageId: number, notes: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/workstation/fail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, stageId, userId: currentUser!.id, notes }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to fail product: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to fail product:', error);
      alert('An unexpected error occurred while failing the product.');
    }
  };

  const handleReworkProduct = async (productId: number) => {
    try {
      const response = await fetch('http://localhost:3001/api/workstation/rework', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, userId: currentUser!.id }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to rework product: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to rework product:', error);
      alert('An unexpected error occurred while reworking the product.');
    }
  };

  const handleMoveProductToStage = async (productId: number, targetStageId: number) => {
    try {
      const response = await fetch('http://localhost:3001/api/workstation/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, targetStageId, userId: currentUser!.id }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to move product: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to move product:', error);
      alert('An unexpected error occurred while moving the product.');
    }
  };

  const handleScrapProduct = async (productId: number, notes: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/workstation/scrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, userId: currentUser!.id, notes }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to scrap product: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to scrap product:', error);
      alert('An unexpected error occurred while scrapping the product.');
    }
  };

  const handleCreateJob = async (newJobData: CreateJobRequest) => {
    const { productType, serialSuffixStart, ...rest } = newJobData;

    try {
      const response = await fetch('http://localhost:3001/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rest,
          productTypeId: productType.id,
          serialSuffixStart,
        }),
      });

      if (response.ok) {
        const newJob = await response.json();
        await fetchAppData(); // Refresh all data
        window.location.hash = `#/jobs/${newJob.id}`;
      } else {
        const errorText = await response.text();
        alert(`Failed to create job: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('An unexpected error occurred while creating the job.');
    }
  };

  const handleUpdateAssignments = async (jobId: number, productionStageId: number, userId: number, isAssigned: boolean) => {
    try {
      const url = 'http://localhost:3001/api/job-assignments';
      const method = isAssigned ? 'POST' : 'DELETE';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, productionStageId, userId }),
      });

      if (response.ok) {
        // Refresh the job assignments specifically, or all app data for simplicity
        await fetchAppData(); 
      } else {
        const errorText = await response.text();
        alert(`Failed to update assignment: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      alert('An unexpected error occurred while updating the assignment.');
    }
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

  const handleAddStage = async (productTypeId: number, newStageData: Omit<ProductionStage, 'id' | 'productTypeId'>) => {
    try {
      const response = await fetch('http://localhost:3001/api/production-stages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newStageData, productTypeId }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to add stage: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to add stage:', error);
      alert('An unexpected error occurred while adding the stage.');
    }
  };

  const handleUpdateStage = async (updatedStage: ProductionStage) => {
    try {
      const response = await fetch(`http://localhost:3001/api/production-stages/${updatedStage.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedStage),
        });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to update stage: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to update stage:', error);
      alert('An unexpected error occurred while updating the stage.');
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (window.confirm('Are you sure you want to delete this stage? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://localhost:3001/api/production-stages/${stageId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchAppData(); // Refresh all data
        } else {
          const errorText = await response.text();
          alert(`Failed to delete stage: ${errorText}`);
        }
      } catch (error) {
        console.error('Failed to delete stage:', error);
        alert('An unexpected error occurred while deleting the stage.');
      }
    }
  };
  
  const handleBulkAddStages = async (productTypeId: number, newStages: Omit<ProductionStage, 'id' | 'productTypeId'>[]) => {
    try {
      const response = await fetch('http://localhost:3001/api/production-stages/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stages: newStages, productTypeId }),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to bulk add stages: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to bulk add stages:', error);
      alert('An unexpected error occurred while bulk adding stages.');
    }
  };

  const handleCreateProductType = async (typeName: string, partNumber: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/product-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ typeName, partNumber }),
      });

      if (response.ok) {
        const newProductType = await response.json();
        await fetchAppData(); // Refresh all data
        window.location.hash = `#/product-types/${newProductType.id}`;
      } else {
        const errorText = await response.text();
        alert(`Failed to create product type: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to create product type:', error);
      alert('An unexpected error occurred while creating the product type.');
    }
  };

  const handleCreateUser = (newUser: Omit<User, 'id'>) => {
      setUsers(prev => {
          const newId = Math.max(0, ...prev.map(u => u.id)) + 1;
          return [...prev, { ...newUser, id: newId }];
      });
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });

      if (response.ok) {
        await fetchAppData(); // Refresh all data
      } else {
        const errorText = await response.text();
        alert(`Failed to update user: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('An unexpected error occurred while updating the user.');
    }
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
