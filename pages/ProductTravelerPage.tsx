import React, { useMemo } from 'react';
import { Product, StageEvent, ProductStageLink, ProductionStage, User, StageEventStatus } from '../types';

interface ProductTravelerPageProps {
    product: Product;
    events: StageEvent[];
    links: ProductStageLink[];
    stages: ProductionStage[];
    users: User[];
}

const EventStatusBadge: React.FC<{ status: StageEventStatus }> = ({ status }) => {
    const styles = {
        [StageEventStatus.PENDING]: 'bg-gray-600/30 text-gray-400',
        [StageEventStatus.STARTED]: 'bg-blue-500/20 text-blue-300',
        [StageEventStatus.PASSED]: 'bg-green-500/20 text-green-300',
        [StageEventStatus.FAILED]: 'bg-red-500/20 text-red-300',
        [StageEventStatus.RESET]: 'bg-yellow-500/20 text-yellow-300',
        [StageEventStatus.SCRAPPED]: 'bg-purple-500/20 text-purple-300',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const ProductStatusBadge: React.FC<{ status: Product['status'] }> = ({ status }) => {
    const styles = {
        'Pending': 'bg-gray-600/30 text-gray-400',
        'In Progress': 'bg-blue-500/20 text-blue-300',
        'Completed': 'bg-green-500/20 text-green-300',
        'Scrapped': 'bg-red-500/20 text-red-300',
    };
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

export const ProductTravelerPage: React.FC<ProductTravelerPageProps> = ({ product, events, links, stages, users }) => {
    const backLink = `#/jobs/${product.jobId}`;
    const sortedStages = useMemo(() => [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder), [stages]);

    const eventsByStage = useMemo(() => {
        const grouped: { [key: number]: StageEvent[] } = {};
        
        sortedStages.forEach(stage => {
            const link = links.find(l => l.productionStageId === stage.id);
            if (link) {
                const eventsForStage = events
                    .filter(e => e.productStageLinkId === link.id)
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                if (eventsForStage.length > 0) {
                    grouped[stage.id] = eventsForStage;
                }
            }
        });

        return grouped;
    }, [events, links, sortedStages]);

    const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.hash = backLink;
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">Product Traveler</h1>
                    <p className="text-lg text-gray-400 mt-1">
                        Serial Number: <span className="font-mono text-cyan-400">{product.serialNumber}</span>
                    </p>
                </div>
                <a 
                    href={backLink} 
                    onClick={handleBackClick}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center text-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back to Job Details
                </a>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8 flex items-center space-x-4">
                <span className="text-gray-300 font-semibold">Current Status:</span>
                <ProductStatusBadge status={product.status} />
            </div>

            <div className="space-y-8">
                {sortedStages.map((stage, index) => {
                    const stageEvents = eventsByStage[stage.id];
                    const hasEvents = stageEvents && stageEvents.length > 0;

                    return (
                        <div key={stage.id} className="relative pl-8">
                            {/* Timeline vertical line */}
                            <div className="absolute top-0 left-3.5 h-full w-0.5 bg-gray-700"></div>
                            
                            {/* Timeline circle */}
                            <div className={`absolute top-1 left-0 w-8 h-8 rounded-full flex items-center justify-center
                                ${hasEvents ? 'bg-cyan-500' : 'bg-gray-600'}`
                            }>
                                <span className="text-white font-bold">{index + 1}</span>
                            </div>
                            
                            <h2 className="text-2xl font-bold mb-4 ml-4">{stage.stageName}</h2>
                            
                            <div className="ml-4 bg-gray-800 rounded-lg shadow-lg p-4">
                                {hasEvents ? (
                                    <ul className="divide-y divide-gray-700">
                                        {stageEvents.map(event => {
                                            const user = users.find(u => u.id === event.userId);
                                            return (
                                                <li key={event.id} className="py-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <EventStatusBadge status={event.status} />
                                                            <span className="font-semibold text-gray-300">{user?.username || 'System'}</span>
                                                            <span className="text-xs text-gray-500 font-mono">
                                                                {new Date(event.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {event.durationSeconds && (
                                                            <div className="text-xs text-gray-400">
                                                                Duration: {(event.durationSeconds / 60).toFixed(1)} mins
                                                            </div>
                                                        )}
                                                    </div>
                                                    {event.notes && (
                                                        <p className="mt-2 text-sm text-gray-400 pl-4 border-l-2 border-gray-600 italic">
                                                            "{event.notes}"
                                                        </p>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 text-sm">No events recorded for this stage.</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
