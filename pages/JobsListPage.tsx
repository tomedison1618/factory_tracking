import React from 'react';
import { Job } from '../types';

interface JobsListPageProps {
    jobs: Job[];
}

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

export const JobsListPage: React.FC<JobsListPageProps> = ({ jobs }) => {
    
    const sortedJobs = [...jobs].sort((a, b) => {
        if (a.status === b.status) {
            return a.dueDate.localeCompare(b.dueDate);
        }
        return a.status === 'Open' ? -1 : 1;
    });

    const handleJobClick = (jobId: number) => {
        window.location.hash = `#/jobs/${jobId}`;
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Jobs</h1>
                <a 
                    href="#/jobs/new" 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/jobs/new'; }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create New Job
                </a>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                <table className="min-w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                        <tr>
                            <th scope="col" className="px-6 py-3">Docket Number</th>
                            <th scope="col" className="px-6 py-3">Product Type</th>
                            <th scope="col" className="px-6 py-3">Quantity</th>
                            <th scope="col" className="px-6 py-3">Priority</th>
                            <th scope="col" className="px-6 py-3">Due Date</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedJobs.map(job => (
                            <tr key={job.id} className="hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer" onClick={() => handleJobClick(job.id)}>
                                <td className="px-6 py-4 font-medium text-white">{job.docketNumber}</td>
                                <td className="px-6 py-4">{job.productType.typeName}</td>
                                <td className="px-6 py-4">{job.quantity}</td>
                                <td className="px-6 py-4"><PriorityBadge priority={job.priority} /></td>
                                <td className="px-6 py-4">{new Date(job.dueDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};