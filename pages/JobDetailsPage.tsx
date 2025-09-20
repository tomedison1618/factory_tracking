import React, { useState, useMemo } from 'react';
import { formatStageEventNotes } from '../utils/formatStageEventNotes';
import { Job, User, ProductionStage, JobAssignment, UserRole, JobStageStatus, Product, ProductStageLink, StageEvent, StageEventStatus } from '../types';

interface JobDetailsPageProps {
  job: Job;
  users: User[];
  productionStages: ProductionStage[];
  jobAssignments: JobAssignment[];
  jobStageStatuses: JobStageStatus[];
  products: Product[];
  onUpdateAssignments: (jobId: number, productionStageId: number, userId: number, isAssigned: boolean) => void;
  onAddProduct: (jobId: number, serialNumber: string, status: Product['status']) => void;
  currentUser: User;
  stageEvents: StageEvent[];
  productStageLinks: ProductStageLink[];
  onReworkProduct: (productId: number, stageId: number) => void;
  onMoveProductToStage: (productId: number, targetStageId: number) => void;
  onScrapProduct: (productId: number, notes: string) => void;
  onUpdateJobPriority: (jobId: number, priority: number) => void;
}

interface FailedProductInfo extends Product {
    latestFailedEvent: StageEvent;
}

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

const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
  const priorityStyles = {
    1: { label: 'High', bg: 'bg-red-500/20', text: 'text-red-300' },
    2: { label: 'Medium', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
    3: { label: 'Normal', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  };
  const style = priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles[3];
  return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>{style.label}</span>;
};

const StatusBadge: React.FC<{ status: 'Open' | 'Completed' }> = ({ status }) => {
    const style = status === 'Open'
        ? 'bg-green-500/20 text-green-300'
        : 'bg-gray-600/30 text-gray-400';
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style}`}>{status}</span>;
};

const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-lg font-semibold text-white">{value}</div>
    </div>
);

const StageStatusBadge: React.FC<{ status: JobStageStatus['status'] }> = ({ status }) => {
    const styles = {
        'Pending': 'bg-gray-600/30 text-gray-400',
        'In Progress': 'bg-blue-500/20 text-blue-300',
        'Completed': 'bg-green-500/20 text-green-300',
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>
}

const StageStatusTable: React.FC<{ stages: ProductionStage[]; statuses: JobStageStatus[]; totalQuantity: number }> = ({ stages, statuses, totalQuantity }) => {
    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <table className="min-w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                    <tr>
                        <th scope="col" className="px-6 py-3">Stage Name</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3 text-center">Passed</th>
                        <th scope="col" className="px-6 py-3 text-center">Failed</th>
                        <th scope="col" className="px-6 py-3 text-center">Scrapped</th>
                        <th scope="col" className="px-6 py-3 text-center">Pending</th>
                        <th scope="col" className="px-6 py-3">Instructions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {stages.map(stage => {
                        const status = statuses.find(s => s.productionStageId === stage.id);
                        const passed = status?.passedCount || 0;
                        const failed = status?.failedCount || 0;
                        const scrapped = status?.scrappedCount || 0;
                        const pending = totalQuantity - passed - scrapped;

                        return (
                            <tr key={stage.id} className="hover:bg-gray-700/50 transition-colors duration-200">
                                <td className="px-6 py-4 font-medium text-white">{stage.stageName}</td>
                                <td className="px-6 py-4"><StageStatusBadge status={status?.status || 'Pending'}/></td>
                                <td className="px-6 py-4 text-center font-mono text-green-400">{passed}</td>
                                <td className="px-6 py-4 text-center font-mono text-red-400">{failed}</td>
                                <td className="px-6 py-4 text-center font-mono text-gray-400">{scrapped}</td>
                                <td className="px-6 py-4 text-center font-mono text-gray-400">{pending < 0 ? 0 : pending}</td>
                                <td className="px-6 py-4">
                                    {stage.instruction_file ? (
                                        <a href={stage.instruction_file} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
                                            Open
                                        </a>
                                    ) : (
                                        <span className="text-gray-500">N/A</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ProductStatusBadge: React.FC<{ status: Product['status'] }> = ({ status }) => {
    const styles: Record<Product['status'], string> = {
        'Pending': 'bg-gray-600/30 text-gray-400',
        'In Progress': 'bg-blue-500/20 text-blue-300',
        'Completed': 'bg-green-500/20 text-green-300',
        'Scrapped': 'bg-purple-600/30 text-purple-400',
        'Failed': 'bg-red-500/20 text-red-300',
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const AddProductForm: React.FC<{ jobId: number, onAddProduct: JobDetailsPageProps['onAddProduct'] }> = ({ jobId, onAddProduct }) => {
    const [serialNumber, setSerialNumber] = useState('');
    const [status, setStatus] = useState<Product['status']>('Pending');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!serialNumber) {
            alert('Please enter a serial number.');
            return;
        }
        onAddProduct(jobId, serialNumber, status);
        setSerialNumber('');
        setStatus('Pending');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-800/50 p-4 rounded-lg mb-4 flex items-center space-x-4">
            <input 
                type="text" 
                placeholder="New Serial Number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="flex-grow bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            />
            <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as Product['status'])}
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Failed">Failed</option>
                <option value="Completed">Completed</option>
                <option value="Scrapped">Scrapped</option>
            </select>
            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-3 rounded-md shadow-sm transition-colors duration-300 flex items-center text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Product
            </button>
        </form>
    )
}

const ProductListTable: React.FC<{
    products: Product[];
    currentUser: User;
    jobAssignments: JobAssignment[];
    stageEvents: StageEvent[];
    productStageLinks: ProductStageLink[];
}> = ({ products, currentUser, jobAssignments, stageEvents, productStageLinks }) => {
    if (products.length === 0) {
        return (
            <div className="bg-gray-800 p-8 rounded-lg text-center text-gray-500">
                <p>No products found for this job.</p>
            </div>
        )
    }

    const handleProductClick = (e: React.MouseEvent<HTMLAnchorElement>, product: Product) => {
        e.preventDefault();
        
        // Find the latest "PENDING" event for this product to determine its current stage.
        const productLinks = productStageLinks.filter(l => l.productId === product.id);
        const linkIds = productLinks.map(l => l.id);
        const latestPendingEvent = stageEvents
            .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.PENDING)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (!latestPendingEvent) {
            alert(`Product "${product.serialNumber}" is not currently pending at any stage.`);
            return;
        }

        const currentLink = productLinks.find(l => l.id === latestPendingEvent.productStageLinkId)!;
        const currentStageId = currentLink.productionStageId;
        
        // Access Control Check
        const isAssigned = jobAssignments.some(a => 
            a.jobId === product.jobId && 
            a.productionStageId === currentStageId && 
            a.userId === currentUser.id
        );

        const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;

        if (!isAssigned && !isManagerOrAdmin) {
            alert(`Access Denied. You are not assigned to the current stage for this job.`);
            return;
        }

        // Navigate to workstation
        window.location.hash = `#/workstation/stage/${currentStageId}/job/${product.jobId}`;
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg max-h-96 overflow-y-auto">
            <table className="min-w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-6 py-3">Serial Number</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {products.map(product => (
                        <tr key={product.id} className="hover:bg-gray-700/50 transition-colors duration-200">
                            <td className="px-6 py-4 font-mono">
                                <a href="#"
                                   onClick={(e) => handleProductClick(e, product)}
                                   className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
                                >
                                    {product.serialNumber}
                                </a>
                            </td>
                            <td className="px-6 py-4"><ProductStatusBadge status={product.status}/></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface AssignmentManagerProps {
    job: Job;
    productionStages: ProductionStage[];
    jobAssignments: JobAssignment[];
    onUpdateAssignments: (jobId: number, productionStageId: number, userId: number, isAssigned: boolean) => void;
    assignableUsers: User[];
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ job, productionStages, jobAssignments, onUpdateAssignments, assignableUsers }) => {
    
    const sortedStages = [...productionStages].sort((a,b) => a.sequenceOrder - b.sequenceOrder);

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
                 <h2 className="text-2xl font-bold mb-4 text-gray-200">Stage Assignments</h2>
                 {jobAssignments.length === 0 && (
                    <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg mb-6 text-sm" role="alert">
                        <div className="flex">
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold">Action Required: Assign Personnel</p>
                                <p>This job has no technicians assigned. Use the grid below to grant access to production stages. Work cannot begin until assignments are made.</p>
                            </div>
                        </div>
                    </div>
                 )}
                 <p className="text-sm text-gray-400 mb-6">Select which technicians are authorized to perform work at each stage for this job. Managers have universal access and do not need to be assigned.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                        <tr>
                            <th scope="col" className="px-6 py-3 sticky left-0 bg-gray-700/50 z-10">Production Stage</th>
                            {assignableUsers.map(user => (
                                <th key={user.id} scope="col" className="px-6 py-3 text-center">{user.username}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedStages.map(stage => (
                            <tr key={stage.id}>
                                <td className="px-6 py-4 font-medium text-white sticky left-0 bg-gray-800 z-10">{stage.stageName}</td>
                                {assignableUsers.map(user => {
                                    const isAssigned = jobAssignments.some(
                                        a => a.productionStageId === stage.id && a.userId === user.id
                                    );
                                    return (
                                        <td key={user.id} className="px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600 cursor-pointer"
                                                checked={isAssigned}
                                                onChange={(e) => onUpdateAssignments(job.id, stage.id, user.id, e.target.checked)}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const ManagerReviewActions: React.FC<{ product: FailedProductInfo, stages: ProductionStage[], onMove: (productId: number, stageId: number) => void; onScrap: (product: Product) => void }> = ({ product, stages, onMove, onScrap }) => {
    const [targetStageId, setTargetStageId] = useState<string>(stages[0]?.id.toString() || '');

    return (
        <div className="flex items-center space-x-2 mt-2">
            <select value={targetStageId} onChange={e => setTargetStageId(e.target.value)} className="bg-gray-600 border border-gray-500 text-white rounded-md px-2 py-1 text-xs focus:ring-cyan-500">
                {stages.map(s => <option key={s.id} value={s.id}>{s.stageName}</option>)}
            </select>
            <button onClick={() => onMove(product.id, parseInt(targetStageId))} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Move to Stage</button>
            <button onClick={() => onScrap(product)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">Scrap</button>
        </div>
    );
};

const FailedProductReview: React.FC<{
    products: FailedProductInfo[];
    stages: ProductionStage[];
    users: User[];
    currentUser: User;
    onRework: (productId: number, stageId: number) => void;
    onMove: (productId: number, stageId: number) => void;
    onScrap: (product: Product) => void;
}> = ({ products, stages, users, currentUser, onRework, onMove, onScrap }) => {
    return (
        <div className="bg-red-900/20 border-2 border-red-500/50 rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-red-300 mb-4">Failed Product Review ({products.length})</h2>
            <div className="space-y-4">
                {products.map(product => {
                    const userWhoFailed = users.find(u => u.id === product.latestFailedEvent.userId);
                    const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
                    const canRework = currentUser.id === product.latestFailedEvent.userId;
                    const failedStageIndex = stages.findIndex(s => s.id === product.latestFailedEvent.productionStageId);
                    const hasPreviousStage = failedStageIndex > 0;
                    const previousStage = hasPreviousStage ? stages[failedStageIndex - 1] : null;
                    const formattedNotes = formatStageEventNotes(product.latestFailedEvent.notes);

                    return (
                        <div key={product.id} className="bg-gray-800 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-mono text-lg text-cyan-400">{product.serialNumber}</p>
                                    <p className="text-xs text-gray-400">
                                        Failed by {userWhoFailed?.username || 'Unknown'} on {new Date(product.latestFailedEvent.timestamp).toLocaleString()}
                                    </p>
                                    {formattedNotes.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-300 pl-3 border-l-2 border-gray-600 italic space-y-1">
                                            {formattedNotes.map((line, noteIndex) => (
                                                <p key={noteIndex}>{line}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-shrink-0">
                                    {isManagerOrAdmin && <ManagerReviewActions product={product} stages={stages} onMove={onMove} onScrap={onScrap} />}
                                    {!isManagerOrAdmin && canRework && hasPreviousStage && (
                                         <button onClick={() => onRework(product.id, product.latestFailedEvent.productionStageId)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">
                                             Rework to {previousStage ? previousStage.stageName : "previous stage"}
                                         </button>
                                    )}
                                    {!isManagerOrAdmin && canRework && !hasPreviousStage && (
                                         <span className="text-xs text-gray-400 italic">Cannot rework from the first stage.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export const JobDetailsPage: React.FC<JobDetailsPageProps> = (props) => {
  const { 
    job, users, productionStages, jobAssignments, jobStageStatuses, products, onUpdateAssignments, onAddProduct,
    currentUser, stageEvents, productStageLinks, onReworkProduct, onMoveProductToStage, onScrapProduct,
    onUpdateJobPriority
  } = props;
  
  const isManagerOrAdmin = currentUser.role === UserRole.MANAGER || currentUser.role === UserRole.ADMIN;
  
  const [activeTab, setActiveTab] = useState((isManagerOrAdmin && jobAssignments.length === 0) ? 'assignments' : 'overview');
  const [scrappingProduct, setScrappingProduct] = useState<Product | null>(null);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  
  const currentStageName = productionStages.find(s => s.id === job.currentStageId)?.stageName || 'N/A';
  const assignableUsers = users.filter(u => u.role === UserRole.TECHNICIAN);
  const sortedStages = [...productionStages].sort((a,b) => a.sequenceOrder - b.sequenceOrder);

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = parseInt(e.target.value, 10);
    onUpdateJobPriority(job.id, newPriority);
    setIsEditingPriority(false);
  };

  const failedProductsForReview = useMemo((): FailedProductInfo[] => {
    const failedProducts = products.filter(p => p.status === 'Failed');

    return failedProducts.map(product => {
        const linksForProduct = productStageLinks.filter(l => l.productId === product.id);
        const linkIds = linksForProduct.map(l => l.id);
        const latestFailedEvent = stageEvents
            .filter(e => linkIds.includes(e.productStageLinkId) && e.status === StageEventStatus.FAILED)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        const productionStageId = productStageLinks.find(l => l.id === latestFailedEvent.productStageLinkId)!.productionStageId;

        return { ...product, latestFailedEvent: { ...latestFailedEvent, productionStageId } };
    }).filter(p => p.latestFailedEvent);
}, [products, productStageLinks, stageEvents]);

  const TabButton: React.FC<{tabName: string; children: React.ReactNode}> = ({ tabName, children }) => {
    const isActive = activeTab === tabName;
    const baseClasses = "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-b-2";
    const activeClasses = "bg-gray-800 text-white border-cyan-400";
    const inactiveClasses = "text-gray-400 hover:text-white hover:bg-gray-700/50 border-transparent";
    return (
        <button onClick={() => setActiveTab(tabName)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {children}
        </button>
    )
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">
          Job Details: <span className="text-cyan-400">{job.docketNumber}</span>
        </h1>
        <a 
            href="#/jobs" 
            onClick={(e) => {
                e.preventDefault();
                window.location.hash = '#/jobs';
            }}
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center text-sm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Jobs List
        </a>
      </div>

      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <InfoCard label="Status" value={<StatusBadge status={job.status} />} />
            
            {isManagerOrAdmin ? (
                <div className="bg-gray-700/50 p-4 rounded-lg group">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                    {!isEditingPriority ? (
                        <div 
                            onClick={() => setIsEditingPriority(true)}
                            className="cursor-pointer flex items-center justify-between"
                            title="Click to edit priority"
                        >
                            <PriorityBadge priority={job.priority} />
                            <span className="text-gray-500 group-hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </div>
                    ) : (
                        <select
                            value={job.priority}
                            onChange={handlePriorityChange}
                            onBlur={() => setIsEditingPriority(false)}
                            autoFocus
                            className="w-full bg-gray-600 border border-gray-500 text-white rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-cyan-500 transition"
                        >
                            <option value="1">High</option>
                            <option value="2">Medium</option>
                            <option value="3">Normal</option>
                        </select>
                    )}
                </div>
            ) : (
                <InfoCard label="Priority" value={<PriorityBadge priority={job.priority} />} />
            )}
            
            <InfoCard label="Quantity" value={job.quantity} />
            <InfoCard label="Product Type" value={job.productType.typeName} />
            <InfoCard label="Current Stage" value={currentStageName} />
            <InfoCard label="Due Date" value={new Date(job.dueDate).toLocaleDateString()} />
        </div>
      </div>

      <div className="border-b border-gray-700">
        <nav className="flex space-x-2">
            <TabButton tabName="overview">Overview</TabButton>
            {isManagerOrAdmin && <TabButton tabName="assignments">Manage Assignments</TabButton>}
        </nav>
      </div>

      <div className="pt-6">
        {activeTab === 'overview' && (
            <div className="space-y-8">
                {failedProductsForReview.length > 0 && (
                    <FailedProductReview
                        products={failedProductsForReview}
                        stages={sortedStages}
                        users={users}
                        currentUser={currentUser}
                        onRework={(productId, stageId) => onReworkProduct(productId, stageId)}
                        onMove={onMoveProductToStage}
                        onScrap={setScrappingProduct}
                    />
                )}
                <div>
                    <h2 className="text-2xl font-bold mb-4 text-gray-200">Stage Status</h2>
                    <StageStatusTable stages={sortedStages} statuses={jobStageStatuses} totalQuantity={job.quantity} />
                </div>
                 <div>
                    <h2 className="text-2xl font-bold mb-4 text-gray-200">Products ({products.length} items)</h2>
                    {isManagerOrAdmin && <AddProductForm jobId={job.id} onAddProduct={onAddProduct} />}
                    <ProductListTable
                        products={products}
                        currentUser={currentUser}
                        jobAssignments={jobAssignments}
                        stageEvents={stageEvents}
                        productStageLinks={productStageLinks}
                    />
                </div>
            </div>
        )}
        {activeTab === 'assignments' && isManagerOrAdmin && (
            <AssignmentManager
                job={job}
                productionStages={productionStages}
                jobAssignments={jobAssignments}
                onUpdateAssignments={onUpdateAssignments}
                assignableUsers={assignableUsers}
            />
        )}
      </div>
    </div>
  );
};
