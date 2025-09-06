import React, { useMemo } from 'react';
import { Job, ProductionStage, User, Product, ProductStageLink, StageEvent, JobAssignment } from '../types';
import { JobSwimlaneBoard } from '../components/JobSwimlaneBoard';

interface JobKanbanPageProps {
    jobs: Job[];
    productionStages: ProductionStage[];
    users: User[];
    products: Product[];
    productStageLinks: ProductStageLink[];
    stageEvents: StageEvent[];
    jobAssignments: JobAssignment[];
}

export const JobKanbanPage: React.FC<JobKanbanPageProps> = ({ jobs, productionStages, users, products, productStageLinks, stageEvents, jobAssignments }) => {
  
  const jobsByProductType = useMemo(() => {
    const openJobs = jobs.filter(j => j.status === 'Open');
    const grouped: { [key: number]: Job[] } = {};
    for (const job of openJobs) {
      if (!grouped[job.productType.id]) {
        grouped[job.productType.id] = [];
      }
      grouped[job.productType.id].push(job);
    }
    return grouped;
  }, [jobs]);

  const productTypeOrder = useMemo(() => {
    return Object.keys(jobsByProductType).map(Number);
  }, [jobsByProductType]);

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 bg-gray-900 flex justify-start items-center border-b border-gray-800 sticky top-0 z-30">
            <h1 className="text-2xl font-bold text-white">Job-Centric Workflow View</h1>
        </div>
        <main className="flex-grow p-4 space-y-8 overflow-y-auto">
            {productTypeOrder.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No open jobs to display.</p>
                </div>
            )}
            {productTypeOrder.map(productTypeId => {
                const jobsForType = jobsByProductType[productTypeId];
                const productTypeName = jobsForType[0].productType.typeName;
                const stagesForType = productionStages.filter(s => s.productTypeId === productTypeId);

                return (
                    <div key={productTypeId}>
                        <h2 className="text-xl font-semibold mb-4 text-cyan-400">{productTypeName} Workflow</h2>
                        <JobSwimlaneBoard
                            jobs={jobsForType}
                            stages={stagesForType}
                            users={users}
                            products={products}
                            productStageLinks={productStageLinks}
                            stageEvents={stageEvents}
                            jobAssignments={jobAssignments}
                        />
                    </div>
                );
            })}
        </main>
    </div>
  );
};