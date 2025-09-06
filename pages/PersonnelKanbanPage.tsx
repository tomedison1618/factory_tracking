import React, { useState, useEffect } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { KanbanColumnData, Job, ProductionStage, User, Product, ProductStageLink, StageEvent, JobAssignment } from '../types';
import { getPersonnelCentricData } from '../services/kanbanService';

interface PersonnelKanbanPageProps {
    jobs: Job[];
    productionStages: ProductionStage[];
    users: User[];
    products: Product[];
    productStageLinks: ProductStageLink[];
    stageEvents: StageEvent[];
    jobAssignments: JobAssignment[];
}

export const PersonnelKanbanPage: React.FC<PersonnelKanbanPageProps> = ({ jobs, productionStages, users, products, productStageLinks, stageEvents, jobAssignments }) => {
  const [kanbanData, setKanbanData] = useState<KanbanColumnData[]>([]);

  useEffect(() => {
    const data = getPersonnelCentricData(jobs, productionStages, users, products, productStageLinks, stageEvents, jobAssignments);
    setKanbanData(data);
  }, [jobs, productionStages, users, products, productStageLinks, stageEvents, jobAssignments]);

  return (
    <div className="flex flex-col h-full">
        <div className="p-4 bg-gray-900 flex justify-start items-center border-b border-gray-800">
            <h1 className="text-2xl font-bold text-white">Personnel-Centric Kanban View</h1>
        </div>
        <main className="flex-grow overflow-hidden px-4 pb-4">
            <KanbanBoard columns={kanbanData} viewMode="personnel" />
        </main>
    </div>
  );
};