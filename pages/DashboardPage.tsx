import React, { useState, useMemo } from 'react';
import { formatStageEventNotes } from '../utils/formatStageEventNotes';
import { Job, ProductionStage, User, Product, JobAssignment, StageEvent, ProductStageLink, StageEventStatus, UserRole, JobStageStatus } from '../types';

interface DashboardPageProps {
    jobs: Job[];
    productionStages: ProductionStage[];
    users: User[];
    currentUser: User;
    products: Product[];
    jobAssignments: JobAssignment[];
    stageEvents: StageEvent[];
    productStageLinks: ProductStageLink[];
    jobStageStatuses: JobStageStatus[];
    onSearch: (serialNumber: string) => void;
    onReworkProduct: (productId: number) => void;
    onMoveProductToStage: (productId: number, targetStageId: number) => void;
    onScrapProduct: (productId: number, notes: string) => void;
}

interface PendingWorkItem {
    product: Product;
    job: Job;
    stage: ProductionStage;
}

interface ReviewWorkItem {
    product: Product;
    job: Job;
    stage: ProductionStage;
    latestFailedEvent: StageEvent;
}

interface StatInfo {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    targetId?: string;
    targetPath?: string;
}


// --- NEW ICONS ---
const ClockIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ListIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
);
const AlertIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const BriefcaseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);
const BoltIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);

// --- NEW StatCard Component ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick }) => {
    const colorClasses = {
        cyan: 'text-cyan-300',
        blue: 'text-blue-300',
        yellow: 'text-yellow-300',
        red: 'text-red-300',
    };
    const clickableClasses = onClick ? 'cursor-pointer hover:bg-gray-700/50 transition-colors' : '';

    return (
        <div 
            onClick={onClick}
            className={`bg-gray-800 p-6 rounded-xl shadow-lg flex items-center justify-between border-t-4 border-${color}-500 ${clickableClasses}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
        >
            <div>
                <p className="text-sm text-gray-400 uppercase tracking-wider">{title}</p>
                <p className="text-4xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className={colorClasses[color as keyof typeof colorClasses]}>
                {icon}
            </div>
        </div>
    );
};


const ScrapModal: React.FC<{ product: Product, onScrap: (notes: string) => void, onCancel: () => void }> = ({ product, onScrap, onCancel }) => {
    const [notes, setNotes] = useState('');
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-white">Scrap Product</h2>
                <p className="text-sm text-gray-400 mb-4">
                    Please provide a reason for scrapping product <span className="font-mono text-cyan-400">{product.serialNumber}</span>.
                </p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-2 focus:ring-red-500 transition"
                    placeholder="Describe the reason for scrapping..."
                    autoFocus
                />
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    <button
                        onClick={() => onScrap(notes)}
                        disabled={!notes.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Confirm Scrap
                    </button>
                </div>
            </div>
        </div>
    );
};

const UniversalSearch: React.FC<{ onSearch: (serialNumber: string) => void }> = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
            setSearchTerm('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Scan or Enter Product Serial Number..."
                    className="w-full bg-gray-700/50 border-2 border-gray-600 text-white text-lg rounded-full py-3 pl-6 pr-16 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
                <button type="submit" className="absolute top-1/2 right-3 -translate-y-1/2 text-cyan-400 hover:text-white transition-colors" title="Search">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </form>
    );
};

const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
  const priorityStyles = {
    1: { label: 'High', bg: 'bg-red-500/20', text: 'text-red-300' },
    2: { label: 'Medium', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
    3: { label: 'Normal', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  };
  const style = priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles[3];
  return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>{style.label}</span>;
};

const DueDateIndicator: React.FC<{ dueDate: string }> = ({ dueDate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let colorClass = 'text-gray-300';
  if (diffDays < 0) {
    colorClass = 'text-red-400 font-bold';
  } else if (diffDays <= 3) {
    colorClass = 'text-yellow-400';
  }

  return <span className={colorClass}>{new Date(dueDate).toLocaleDateString()}</span>;
};

const ManagerReviewActions: React.FC<{ item: ReviewWorkItem, stages: ProductionStage[], onMove: (productId: number, stageId: number) => void; onScrap: (product: Product) => void }> = ({ item, stages, onMove, onScrap }) => {
    const stagesForProductType = stages.filter(s => s.productTypeId === item.job.productType.id);
    const [targetStageId, setTargetStageId] = useState<string>(stagesForProductType[0]?.id.toString() || '');

    return (
        <div className="flex items-center space-x-2">
            <select value={targetStageId} onChange={e => setTargetStageId(e.target.value)} className="bg-gray-600 border border-gray-500 text-white rounded-md px-2 py-1 text-xs focus:ring-cyan-500">
                {stagesForProductType.map(s => <option key={s.id} value={s.id}>{s.stageName}</option>)}
            </select>
            <button onClick={() => onMove(item.product.id, parseInt(targetStageId))} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">Move</button>
            <button onClick={() => onScrap(item.product)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded-md text-xs transition-colors">Scrap</button>
        </div>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = (props) => {
    console.log('DashboardPage props:', props);
    const { jobs, productionStages, users, currentUser, products, jobAssignments, stageEvents, productStageLinks, jobStageStatuses, onSearch, onReworkProduct, onMoveProductToStage, onScrapProduct } = props;
    const [scrappingProduct, setScrappingProduct] = useState<Product | null>(null);

    const pendingWork = useMemo((): PendingWorkItem[] => {
        const pendingProducts = products.filter(p => p.status === 'Pending');
        const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
        
        const workItems: PendingWorkItem[] = [];

        for (const product of pendingProducts) {
            const productLinks = productStageLinks.filter(l => l.productId === product.id);
            const linkIds = productLinks.map(l => l.id);
            
            const latestPendingEvent = stageEvents
                .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.PENDING)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (!latestPendingEvent) continue;

            const currentLink = productLinks.find(l => l.id === latestPendingEvent.productStageLinkId)!;
            const currentStageId = currentLink.productionStageId;
            const currentStage = productionStages.find(s => s.id === currentStageId)!;
            const job = jobs.find(j => j.id === product.jobId)!;

            if (isManagerOrAdmin) {
                workItems.push({ product, job, stage: currentStage });
            } else {
                const isAssigned = jobAssignments.some(a => 
                    a.jobId === product.jobId && 
                    a.productionStageId === currentStageId && 
                    a.userId === currentUser.id
                );
                if (isAssigned) {
                    workItems.push({ product, job, stage: currentStage });
                }
            }
        }
        return workItems.sort((a, b) => (a.job.priority - b.job.priority) || a.job.dueDate.localeCompare(b.job.dueDate));
    }, [currentUser, products, stageEvents, productStageLinks, productionStages, jobAssignments, jobs]);
    console.log('pendingWork:', pendingWork);

    const activeBatch = useMemo((): PendingWorkItem[] => {
        if (currentUser.role !== UserRole.TECHNICIAN) {
            return [];
        }

        const activeProducts = products.filter(p => p.status === 'In Progress' && p.currentWorkerId === currentUser.id);
        
        const workItems: PendingWorkItem[] = [];

        for (const product of activeProducts) {
            const productLinks = productStageLinks.filter(l => l.productId === product.id);
            const linkIds = productLinks.map(l => l.id);
            
            const latestStartedEvent = stageEvents
                .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.STARTED)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (!latestStartedEvent) continue;

            const currentLink = productLinks.find(l => l.id === latestStartedEvent.productStageLinkId)!;
            const currentStageId = currentLink.productionStageId;
            const currentStage = productionStages.find(s => s.id === currentStageId)!;
            const job = jobs.find(j => j.id === product.jobId)!;

            workItems.push({ product, job, stage: currentStage });
        }
        return workItems.sort((a, b) => (a.job.priority - b.job.priority) || a.job.dueDate.localeCompare(b.job.dueDate));
    }, [currentUser, products, stageEvents, productStageLinks, productionStages, jobs]);

     const reviewWork = useMemo((): ReviewWorkItem[] => {
        const failedProducts = products.filter(p => p.status === 'Failed');
        const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
        
        const workItems: ReviewWorkItem[] = [];

        for (const product of failedProducts) {
            const productLinks = productStageLinks.filter(l => l.productId === product.id);
            const linkIds = productLinks.map(l => l.id);
            
            const latestFailedEvent = stageEvents
                .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.FAILED)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (!latestFailedEvent) continue;

            const link = productLinks.find(l => l.id === latestFailedEvent.productStageLinkId)!;
            const stage = productionStages.find(s => s.id === link.productionStageId)!;
            const job = jobs.find(j => j.id === product.jobId)!;

            if (isManagerOrAdmin) {
                workItems.push({ product, job, stage, latestFailedEvent });
            } else {
                if (latestFailedEvent.userId === currentUser.id) {
                     workItems.push({ product, job, stage, latestFailedEvent });
                }
            }
        }
        return workItems.sort((a, b) => (a.job.priority - b.job.priority) || a.job.dueDate.localeCompare(b.job.dueDate));
    }, [currentUser, products, stageEvents, productStageLinks, productionStages, jobs]);
    console.log('reviewWork:', reviewWork);

    const activeJobsWithDetails = useMemo(() => {
        return jobs
            .filter(j => j.status === 'Open')
            .map(job => {
                const productsForJob = products.filter(p => p.jobId === job.id);
                const completedProductsCount = productsForJob.filter(p => p.status === 'Completed' || p.status === 'Scrapped').length;
                const failedProductsCount = productsForJob.filter(p => p.status === 'Failed').length;
                const inProgressProductsCount = productsForJob.filter(p => p.status === 'In Progress').length;
                
                // New, more accurate progress calculation
                const stagesForJob = productionStages.filter(s => s.productTypeId === job.productType.id);
                const statusesForJob = jobStageStatuses.filter(jss => jss.jobId === job.id);
                const totalPossiblePasses = job.quantity * stagesForJob.length;
                const actualPasses = statusesForJob.reduce((sum, status) => sum + status.passedCount, 0);
                const progress = totalPossiblePasses > 0 ? (actualPasses / totalPossiblePasses) * 100 : 0;
                
                const currentStageStatus = jobStageStatuses.find(jss => jss.jobId === job.id && jss.status === 'In Progress');
                const currentStage = currentStageStatus 
                    ? productionStages.find(s => s.id === currentStageStatus.productionStageId) 
                    : productionStages.find(s => s.id === job.currentStageId);

                return {
                    ...job,
                    completedCount: completedProductsCount,
                    failedCount: failedProductsCount,
                    inProgressCount: inProgressProductsCount,
                    totalCount: job.quantity,
                    progress,
                    currentStageName: currentStage?.stageName || 'N/A'
                };
            })
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [jobs, products, productionStages, jobStageStatuses]);
    console.log('activeJobsWithDetails:', activeJobsWithDetails);

    const stats = useMemo((): StatInfo[] => {
        const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
        
        if (isManagerOrAdmin) {
            const totalFailedProducts = products.filter(p => p.status === 'Failed').length;
            const overdueJobsCount = jobs.filter(j => j.status === 'Open' && new Date() > new Date(j.dueDate)).length;
            const totalOpenJobs = jobs.filter(j => j.status === 'Open').length;

            return [
                { title: 'Total Open Jobs', value: totalOpenJobs, icon: <BriefcaseIcon />, color: 'cyan', targetId: 'active-jobs-section' },
                { title: 'Products Awaiting Review', value: totalFailedProducts, icon: <AlertIcon />, color: 'red', targetId: 'review-section' },
                { title: 'Overdue Jobs', value: overdueJobsCount, icon: <ClockIcon />, color: 'yellow', targetId: 'active-jobs-section' },
            ];
        } else {
            const myActiveBatch = products.filter(p => p.status === 'In Progress' && p.currentWorkerId === currentUser.id);
            const myActiveBatchCount = myActiveBatch.length;
            let activeBatchPath: string | undefined = undefined;

            if (myActiveBatchCount > 0) {
                const firstActiveProduct = myActiveBatch[0];
                const jobId = firstActiveProduct.jobId;

                const productLinks = productStageLinks.filter(l => l.productId === firstActiveProduct.id);
                const linkIds = productLinks.map(l => l.id);
                
                const latestStartedEvent = stageEvents
                    .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.STARTED)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                if (latestStartedEvent) {
                    const link = productLinks.find(l => l.id === latestStartedEvent.productStageLinkId);
                    if (link) {
                        const stageId = link.productionStageId;
                        activeBatchPath = `#/workstation/stage/${stageId}/job/${jobId}`;
                    }
                }
            }

            return [
                { title: 'My Pending Items', value: pendingWork.length, icon: <ListIcon />, color: 'cyan', targetId: 'work-queue-section' },
                { 
                    title: 'My Active Batch', 
                    value: myActiveBatchCount, 
                    icon: <BoltIcon />, 
                    color: 'blue',
                    targetPath: activeBatchPath,
                },
                { title: 'Items to Rework', value: reviewWork.length, icon: <AlertIcon />, color: 'yellow', targetId: 'review-section' },
            ];
        }
    }, [currentUser, products, jobs, pendingWork, reviewWork, productStageLinks, stageEvents]);
    console.log('stats:', stats);
    
    const handleWorkItemClick = (e: React.MouseEvent<HTMLTableRowElement>, item: PendingWorkItem) => {
        e.preventDefault();
        window.location.hash = `#/workstation/stage/${item.stage.id}/job/${item.job.id}`;
    };

    const handleJobRowClick = (jobId: number) => {
        window.location.hash = `#/jobs/${jobId}`;
    };

    const handleStatCardClick = (targetId: string | undefined) => {
        if (!targetId) return;
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    const handleNavigation = (path: string) => {
        window.location.hash = path;
    };


    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 bg-gray-900">
            {scrappingProduct && (
                <ScrapModal 
                    product={scrappingProduct}
                    onCancel={() => setScrappingProduct(null)}
                    onScrap={(notes) => {
                        onScrapProduct(scrappingProduct.id, notes);
                        setScrappingProduct(null);
                    }}
                />
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map(stat => (
                    <StatCard 
                        key={stat.title} 
                        title={stat.title}
                        value={stat.value}
                        icon={stat.icon}
                        color={stat.color}
                        onClick={
                            stat.targetId
                                ? () => handleStatCardClick(stat.targetId)
                                : stat.targetPath
                                ? () => handleNavigation(stat.targetPath!)
                                : undefined
                        }
                    />
                ))}
            </div>
            
            {/* Search Section */}
            <div className="text-center p-6 bg-gray-800 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Start Workstation</h2>
                <div className="flex justify-center">
                    <UniversalSearch onSearch={onSearch} />
                </div>
            </div>

            {/* Awaiting Review Section */}
            {reviewWork.length > 0 && (
                <div id="review-section" className="bg-gray-800 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold p-4 border-b border-gray-700 text-yellow-300">
                        {currentUser.role === UserRole.TECHNICIAN ? 'Items Awaiting Rework' : 'Items Awaiting Review'} ({reviewWork.length})
                    </h2>
                    <div className="p-4 space-y-4 h-96 overflow-y-auto">
                        {reviewWork.map(item => {
                            const formattedNotes = formatStageEventNotes(item.latestFailedEvent.notes);
                            return (
                                <div key={item.product.id} className="bg-gray-700/50 p-4 rounded-lg border-l-4 border-yellow-500 flex justify-between items-center">
                                    <div>
                                        <p className="font-mono text-lg text-cyan-400">{item.product.serialNumber}</p>
                                        <p className="text-sm text-gray-400">Job: {item.job.docketNumber} | Failed at: {item.stage.stageName}</p>
                                        {formattedNotes.length > 0 && (
                                            <div className="text-xs text-gray-300 italic mt-1 pl-2 border-l-2 border-gray-600 space-y-1">
                                                {formattedNotes.map((line, noteIndex) => (
                                                    <p key={noteIndex}>{line}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        {(currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN) ? (
                                            <ManagerReviewActions item={item} stages={productionStages} onMove={onMoveProductToStage} onScrap={setScrappingProduct} />
                                        ) : (
                                            <button onClick={() => onReworkProduct(item.product.id)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Rework</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* My Active Batch Section (Technician Only) */}
            {currentUser.role === UserRole.TECHNICIAN && activeBatch.length > 0 && (
                <div id="active-batch-section" className="bg-gray-800 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold p-4 border-b border-gray-700 text-blue-300">
                        My Active Batch ({activeBatch.length})
                    </h2>
                    <div className="overflow-y-auto h-96">
                        <table className="min-w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Serial Number</th>
                                    <th scope="col" className="px-6 py-3">Job</th>
                                    <th scope="col" className="px-6 py-3">Working on Stage</th>
                                    <th scope="col" className="px-6 py-3">Product Type</th>
                                    <th scope="col" className="px-6 py-3">Due</th>
                                    <th scope="col" className="px-6 py-3">Priority</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {activeBatch.map(item => (
                                    <tr key={item.product.id} className="hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer" onClick={(e) => handleWorkItemClick(e, item)}>
                                        <td className="px-6 py-3 font-mono text-cyan-400">{item.product.serialNumber}</td>
                                        <td className="px-6 py-3">{item.job.docketNumber}</td>
                                        <td className="px-6 py-3">{item.stage.stageName}</td>
                                        <td className="px-6 py-3">{item.job.productType.typeName}</td>
                                        <td className="px-6 py-3"><DueDateIndicator dueDate={item.job.dueDate} /></td>
                                        <td className="px-6 py-3"><PriorityBadge priority={item.job.priority} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div className="space-y-8">
                {/* My Work Queue Section */}
                <div id="work-queue-section" className="flex flex-col bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <h2 className="text-xl font-bold p-4 border-b border-gray-700">My Work Queue ({pendingWork.length})</h2>
                    <div className="overflow-y-auto h-96">
                        <table className="min-w-full text-left text-sm text-gray-300">
                            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Serial Number</th>
                                    <th scope="col" className="px-6 py-3">Job</th>
                                    <th scope="col" className="px-6 py-3">Current Stage</th>
                                    <th scope="col" className="px-6 py-3">Due</th>
                                    <th scope="col" className="px-6 py-3">Priority</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {pendingWork.map(item => (
                                    <tr key={item.product.id} className="hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer" onClick={(e) => handleWorkItemClick(e, item)}>
                                        <td className="px-6 py-3 font-mono text-cyan-400">{item.product.serialNumber}</td>
                                        <td className="px-6 py-3">{item.job.docketNumber}</td>
                                        <td className="px-6 py-3">{item.stage.stageName}</td>
                                        <td className="px-6 py-3"><DueDateIndicator dueDate={item.job.dueDate} /></td>
                                        <td className="px-6 py-3"><PriorityBadge priority={item.job.priority} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {pendingWork.length === 0 && <p className="text-gray-500 text-center p-8">No pending work assigned to you.</p>}
                    </div>
                </div>

                {/* Active Jobs Section */}
                <div id="active-jobs-section" className="flex flex-col bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <h2 className="text-xl font-bold p-4 border-b border-gray-700">Active Jobs ({activeJobsWithDetails.length})</h2>
                    <div className="overflow-y-auto">
                         {activeJobsWithDetails.length > 0 ? (
                            <table className="min-w-full text-left text-sm text-gray-300">
                                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Docket</th>
                                        <th scope="col" className="px-4 py-3">Due</th>
                                        <th scope="col" className="px-4 py-3">Priority</th>
                                        <th scope="col" className="px-4 py-3">Progress</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {activeJobsWithDetails.map(job => (
                                        <tr key={job.id} className="hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer" onClick={() => handleJobRowClick(job.id)}>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center">
                                                    <span className="font-medium text-white">{job.docketNumber}</span>
                                                    {job.failedCount > 0 && (
                                                        <span title="This job has failed products needing review">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.242-1.21 2.878 0l5.394 10.273c.636 1.21-.213 2.628-1.439 2.628H4.302c-1.226 0-2.075-1.418-1.439-2.628L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">{job.productType.typeName}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top"><DueDateIndicator dueDate={job.dueDate} /></td>
                                            <td className="px-4 py-3 align-top"><PriorityBadge priority={job.priority} /></td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                                                    <span>{job.currentStageName}</span>
                                                    <span>{job.completedCount} of {job.totalCount}</span>
                                                </div>
                                                <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                                                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${job.progress}%` }}></div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs font-mono">
                                                    <span className="text-green-400" title="Completed">C: {job.completedCount}</span>
                                                    <span className="text-blue-400" title="In Progress">P: {job.inProgressCount}</span>
                                                    <span className="text-red-400" title="Failed">F: {job.failedCount}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-gray-500 text-center p-8">No active jobs.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
