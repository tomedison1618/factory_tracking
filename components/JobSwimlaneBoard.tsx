import React from 'react';
import { Job, ProductionStage, User, Product, ProductStageLink, StageEvent, JobAssignment } from '../types';
import { getProductsByStageForJob } from '../services/kanbanService';
import { StageProductCell } from './StageProductCell';

interface JobSwimlaneBoardProps {
    jobs: Job[];
    stages: ProductionStage[];
    users: User[];
    products: Product[];
    productStageLinks: ProductStageLink[];
    stageEvents: StageEvent[];
    jobAssignments: JobAssignment[];
}

const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
  const priorityStyles = {
    1: { label: 'High', bg: 'bg-red-500/20', text: 'text-red-300' },
    2: { label: 'Medium', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
    3: { label: 'Normal', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  };
  const style = priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles[3];
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>{style.label}</span>;
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


export const JobSwimlaneBoard: React.FC<JobSwimlaneBoardProps> = ({ jobs, stages, users, products, productStageLinks, stageEvents, jobAssignments }) => {
    const sortedStages = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const sortedJobs = [...jobs].sort((a,b) => a.dueDate.localeCompare(b.dueDate));

    const gridTemplateColumns = `minmax(200px, 1.5fr) repeat(${sortedStages.length}, minmax(180px, 1fr))`;

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
                {/* Header */}
                <div className="grid sticky top-0 bg-gray-800 z-20" style={{ gridTemplateColumns }}>
                    <div className="p-4 border-b border-r border-gray-700 text-sm font-bold uppercase text-gray-400 sticky left-0 bg-gray-800 z-10">Job Details</div>
                    {sortedStages.map(stage => {
                        const jobIdsOnThisBoard = new Set(jobs.map(j => j.id));
                        
                        const assignedUserIds = new Set<number>();
                        jobAssignments.forEach(assignment => {
                            if (assignment.productionStageId === stage.id && jobIdsOnThisBoard.has(assignment.jobId)) {
                                assignedUserIds.add(assignment.userId);
                            }
                        });

                        const assignedUsers = Array.from(assignedUserIds)
                            .map(userId => users.find(u => u.id === userId))
                            .filter((u): u is User => !!u)
                            .map(u => u.username);
                        
                        return (
                            <div key={stage.id} className="p-4 border-b border-r border-gray-700 text-sm text-center text-gray-300 whitespace-nowrap">
                                <div className="font-bold">{stage.stageName}</div>
                                {assignedUsers.length > 0 && (
                                    <div className="text-xs text-gray-400 font-normal mt-1 truncate" title={assignedUsers.join(', ')}>
                                        {assignedUsers.join(', ')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="divide-y divide-gray-700">
                    {sortedJobs.map(job => {
                        const productsByStage = getProductsByStageForJob(job.id, products, productStageLinks, stageEvents);

                        return (
                            <div key={job.id} className="grid" style={{ gridTemplateColumns }}>
                                {/* Job Info Cell (Sticky) */}
                                <div className="sticky left-0 bg-gray-800 p-4 border-r border-gray-700 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-white mb-1">{job.docketNumber}</h3>
                                        <p className="text-xs text-gray-400">Total Qty: {job.quantity}</p>
                                    </div>
                                    <div className="space-y-2 mt-2 text-xs">
                                        <div><PriorityBadge priority={job.priority} /></div>
                                        <div className="text-gray-400">
                                            Due: <DueDateIndicator dueDate={job.dueDate} />
                                        </div>
                                    </div>
                                </div>

                                {/* Stage Cells */}
                                {sortedStages.map(stage => {
                                    const productsInCell = productsByStage.get(stage.id) || [];
                                    
                                    return (
                                        <div key={stage.id} className="p-2 border-r border-gray-700 align-top">
                                            <StageProductCell 
                                                products={productsInCell}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};