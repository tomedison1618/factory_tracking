
import React from 'react';
import { KanbanColumnData } from '../types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  column: KanbanColumnData;
  viewMode: 'job' | 'personnel';
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, viewMode }) => {
  return (
    <div className="flex-shrink-0 w-80 bg-gray-800/50 rounded-xl shadow-md">
      <div className="sticky top-0 bg-gray-800/80 backdrop-blur-sm p-4 rounded-t-xl z-10">
        <h2 className="text-lg font-bold text-white flex justify-between items-center">
          <span>{column.title}</span>
          <span className="text-sm font-normal bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">{column.cards.length}</span>
        </h2>
      </div>
      <div className="p-4 space-y-4 h-[calc(100vh-14rem)] overflow-y-auto">
        {column.cards.map(card => (
          <KanbanCard key={card.id} card={card} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};
