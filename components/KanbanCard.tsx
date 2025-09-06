
import React from 'react';
import { KanbanCardData } from '../types';

interface KanbanCardProps {
  card: KanbanCardData;
  viewMode: 'job' | 'personnel';
}

const PriorityIndicator: React.FC<{ priority: number }> = ({ priority }) => {
  const priorityStyles = {
    1: { label: 'High', color: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
    2: { label: 'Medium', color: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    3: { label: 'Normal', color: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  };
  const style = priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles[3];

  return <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>{style.label}</div>;
};

const DueDateIndicator: React.FC<{ dueDate: string }> = ({ dueDate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let colorClass = 'text-gray-400';
  if (diffDays < 0) {
    colorClass = 'text-red-400 font-bold';
  } else if (diffDays <= 3) {
    colorClass = 'text-yellow-400';
  }

  return <span className={colorClass}>{new Date(dueDate).toLocaleDateString()}</span>;
};

export const KanbanCard: React.FC<KanbanCardProps> = ({ card, viewMode }) => {
  const priorityStyles = {
    1: 'border-red-500',
    2: 'border-yellow-500',
    3: 'border-blue-500',
  };
  const borderColor = priorityStyles[card.priority as keyof typeof priorityStyles] || priorityStyles[3];

  return (
    <div className={`relative bg-gray-800 p-4 rounded-lg shadow-lg border-l-4 ${borderColor} hover:shadow-cyan-500/20 transition-shadow duration-300`}>
      <PriorityIndicator priority={card.priority} />
      
      <h3 className="font-bold text-lg mb-2 pr-16">{card.title}</h3>
      <p className="text-sm text-gray-300 mb-3">{card.content}</p>

      <div className="text-xs text-gray-400 space-y-2">
        {viewMode === 'job' ? (
          <div className="flex items-center">
            <UserIcon />
            <span className="ml-2">{card.user.username}</span>
          </div>
        ) : (
          <div className="flex items-center">
            <StageIcon />
            <span className="ml-2">{card.stage.stageName}</span>
          </div>
        )}
        <div className="flex items-center">
          <CalendarIcon />
          <span className="ml-2">
            Due: <DueDateIndicator dueDate={card.dueDate} />
          </span>
        </div>
      </div>
    </div>
  );
};


const UserIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const StageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const CalendarIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);
