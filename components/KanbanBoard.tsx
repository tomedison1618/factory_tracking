
import React from 'react';
import { KanbanColumnData } from '../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  columns: KanbanColumnData[];
  viewMode: 'job' | 'personnel';
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, viewMode }) => {
  if (columns.length === 0) {
    return <div className="flex justify-center items-center h-full text-gray-500">Loading data...</div>;
  }
  
  return (
    <div className="flex space-x-4 p-4 overflow-x-auto h-full">
      {columns.map(column => (
        <KanbanColumn key={column.id} column={column} viewMode={viewMode} />
      ))}
    </div>
  );
};
