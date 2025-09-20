import React, { useState, useMemo, useEffect } from 'react';
import { Job, ProductionStage, Product, User, StageEvent, ProductStageLink, StageEventStatus } from '../types';

interface WorkstationPageProps {
    job: Job;
    stage: ProductionStage;
    products: Product[];
    currentUser: User;
    stageEvents: StageEvent[];
    productStageLinks: ProductStageLink[];
    onStartWork: (productIds: number[], stageId: number) => void;
    onPassProducts: (productIds: number[], stageId: number) => void;
    onFailProduct: (productId: number, stageId: number, notes: string) => void;
}

const failureOptions = [
    "Component Malfunction",
    "Assembly Error",
    "Cosmetic Defect",
    "Software Issue",
    "Other", // removed "(please specify)" to make it a distinct option
];

const FailModal: React.FC<{ product: Product, onFail: (notes: string) => void, onCancel: () => void }> = ({ product, onFail, onCancel }) => {
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [details, setDetails] = useState('');

    const handleReasonToggle = (reason: string) => {
        setSelectedReasons(prev =>
            prev.includes(reason)
                ? prev.filter(r => r !== reason)
                : [...prev, reason]
        );
    };

    const handleFail = () => {
        const notesPayload = {
            reasons: selectedReasons,
            details: details,
        };
        onFail(JSON.stringify(notesPayload));
    };

    const isOtherSelected = selectedReasons.includes("Other");

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-white">Report Failure</h2>
                <p className="text-sm text-gray-400 mb-4">
                    Select all applicable failure reasons for product <span className="font-mono text-cyan-400">{product.serialNumber}</span>.
                </p>
                
                <div className="space-y-2">
                    <p className="block text-sm font-medium text-gray-300 mb-2">Failure Reasons</p>
                    {failureOptions.map(reason => (
                        <label key={reason} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedReasons.includes(reason)}
                                onChange={() => handleReasonToggle(reason)}
                                className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-600"
                            />
                            <span className="text-white">{reason}</span>
                        </label>
                    ))}
                </div>

                {(isOtherSelected || details) && (
                    <div className="mt-4">
                        <label htmlFor="failure-details" className="block text-sm font-medium text-gray-300 mb-2">
                            {isOtherSelected ? "Please specify 'Other' reason" : "Additional Notes (Optional)"}
                        </label>
                        <textarea
                            id="failure-details"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-2 focus:ring-red-500 transition"
                            placeholder={isOtherSelected ? "Specify the reason for failure..." : "Add any extra details..."}
                        />
                    </div>
                )}

                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                    <button
                        onClick={handleFail}
                        disabled={selectedReasons.length === 0 || (isOtherSelected && !details.trim())}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Confirm Failure
                    </button>
                </div>
            </div>
        </div>
    );
};

const WorkstationScanner: React.FC<{ onScan: (serialNumber: string) => void; }> = ({ onScan }) => {
    const [serialNumber, setSerialNumber] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (serialNumber.trim()) {
            onScan(serialNumber.trim());
            setSerialNumber('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex-grow max-w-md">
            <div className="relative">
                <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Scan to start work or select active item..."
                    className="w-full bg-gray-700/50 border-2 border-gray-600 text-white rounded-full py-2 pl-5 pr-12 focus:ring-2 focus:ring-blue-500 transition"
                    autoFocus
                />
                <button type="submit" className="absolute top-1/2 right-3 -translate-y-1/2 text-blue-400 hover:text-white transition-colors" title="Start Work">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </button>
            </div>
        </form>
    );
};

const getLatestEventForLink = (events: StageEvent[]): StageEvent | null => {
    if (events.length === 0) {
        return null;
    }

    return events.reduce((latest, event) => {
        const latestTime = new Date(latest.timestamp).getTime();
        const eventTime = new Date(event.timestamp).getTime();

        if (eventTime > latestTime) {
            return event;
        }

        if (eventTime === latestTime) {
            const latestId = latest.id ?? 0;
            const eventId = event.id ?? 0;
            if (eventId > latestId) {
                return event;
            }
        }

        return latest;
    }, events[0]);
};

export const WorkstationPage: React.FC<WorkstationPageProps> = ({
    job,
    stage,
    products,
    currentUser,
    stageEvents,
    productStageLinks,
    onStartWork,
    onPassProducts,
    onFailProduct,
}) => {
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [selectedActiveProducts, setSelectedActiveProducts] = useState<Set<number>>(new Set());
    const [failingProduct, setFailingProduct] = useState<Product | null>(null);

    const pendingProducts = useMemo(() => {
        console.log("Recalculating pending products...");
        const pending = products.filter(product => {
            const link = productStageLinks.find(l => l.productId === product.id && l.productionStageId === stage.id);
            if (!link) {
                console.log(`Product ${product.serialNumber} has no link for stage ${stage.id}`);
                return false;
            }

            const eventsForLink = stageEvents.filter(e => e.productStageLinkId === link.id);
            
            if (eventsForLink.length === 0) {
                console.log(`Product ${product.serialNumber} has no events for link ${link.id}`);
                return false; // No events for this product at this stage yet.
            }

            const latestEvent = getLatestEventForLink(eventsForLink);
            if (!latestEvent) {
                console.log(`Product ${product.serialNumber} has no determinable latest event at stage ${stage.id}`);
                return false;
            }
            console.log(`Product ${product.serialNumber} latest event at stage ${stage.id}:`, latestEvent);

            // A product is pending here if its latest action at this stage is PENDING.
            // This handles cases where a product is moved back to this stage after failing later on.
            const isPending = latestEvent.status === StageEventStatus.PENDING;
            console.log(`Product ${product.serialNumber} is pending at stage ${stage.id}: ${isPending}`);
            return isPending;
        });
        console.log("Pending products:", pending);
        return pending;
    }, [products, stage.id, productStageLinks, stageEvents]);

    const activeBatch = useMemo(() => {
        console.log("Recalculating active batch...");
        const active = products.filter(product => {
            // Find the specific link for this product at this stage.
            const link = productStageLinks.find(l => l.productId === product.id && l.productionStageId === stage.id);
            if (!link) {
                return false;
            }

            // Get all events related to this specific product-stage link.
            const eventsForLink = stageEvents.filter(e => e.productStageLinkId === link.id);

            if (eventsForLink.length === 0) {
                return false;
            }

            // The very last thing that happened to this product at this stage must be a "STARTED" event.
            const latestEvent = getLatestEventForLink(eventsForLink);
            if (!latestEvent) {
                return false;
            }
            const isActive = latestEvent.status === StageEventStatus.STARTED && product.currentWorkerId === currentUser.id;
            return isActive;
        });
        console.log("Active batch:", active);
        return active;
    }, [products, currentUser.id, stage.id, productStageLinks, stageEvents]);

    const toggleProductSelection = (productId: number) => {
        setSelectedProducts(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(productId)) {
                newSelection.delete(productId);
            } else {
                newSelection.add(productId);
            }
            return newSelection;
        });
    };
    
    const handleStartSelected = () => {
        onStartWork(Array.from(selectedProducts), stage.id);
        setSelectedProducts(new Set());
    }
    
    const handleScan = (serialNumber: string) => {
        const lowercasedSerial = serialNumber.toLowerCase();

        // 1. Check pending products to start work
        const productToStart = pendingProducts.find(p => p.serialNumber.toLowerCase() === lowercasedSerial);
        if (productToStart) {
            onStartWork([productToStart.id], stage.id);
            return;
        }

        // 2. Check active products to toggle selection
        const productToToggle = activeBatch.find(p => p.serialNumber.toLowerCase() === lowercasedSerial);
        if (productToToggle) {
            toggleActiveProductSelection(productToToggle.id);
            return;
        }

        // 3. If not found in either list
        alert(`Product "${serialNumber}" is not available in the pending or active lists for this stage.`);
    };

    const allPendingIds = useMemo(() => pendingProducts.map(p => p.id), [pendingProducts]);
    const areAllSelected = allPendingIds.length > 0 && allPendingIds.every(id => selectedProducts.has(id));

    const handleSelectAllClick = () => {
        if (areAllSelected) {
            setSelectedProducts(new Set()); // Deselect all
        } else {
            setSelectedProducts(new Set(allPendingIds)); // Select all
        }
    };

    const allActiveIds = useMemo(() => activeBatch.map(p => p.id), [activeBatch]);
    const areAllActiveSelected = allActiveIds.length > 0 && allActiveIds.every(id => selectedActiveProducts.has(id));

    const toggleActiveProductSelection = (productId: number) => {
        setSelectedActiveProducts(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(productId)) {
                newSelection.delete(productId);
            } else {
                newSelection.add(productId);
            }
            return newSelection;
        });
    };

    const handleSelectAllActiveClick = () => {
        if (areAllActiveSelected) {
            setSelectedActiveProducts(new Set());
        } else {
            setSelectedActiveProducts(new Set(allActiveIds));
        }
    };

    const handlePassSelected = () => {
        if (selectedActiveProducts.size === 0) return;
        const productIdsToPass = Array.from(selectedActiveProducts);
        onPassProducts(productIdsToPass, stage.id);
        setSelectedActiveProducts(new Set());
    };
    

    return (
        <div className="flex flex-col h-full p-4 gap-4">
             {failingProduct && (
                <FailModal
                    product={failingProduct}
                    onCancel={() => setFailingProduct(null)}
                    onFail={(notes) => {
                        onFailProduct(failingProduct.id, stage.id, notes);
                        setFailingProduct(null);
                    }}
                />
            )}
            <header className="bg-gray-800 p-4 rounded-xl shadow-lg flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold text-white">Workstation: <span className="text-cyan-400">{stage.stageName}</span></h1>
                    <p className="text-sm text-gray-400">
                        Job: <span className="font-semibold">{job.docketNumber}</span>  |  Product: <span className="font-semibold">{job.productType.typeName}</span>
                    </p>
                 </div>
                 <WorkstationScanner onScan={handleScan} />
            </header>
            <main className="flex-grow flex gap-4 overflow-hidden">
                {/* Left Panel: Pending */}
                <div className="w-1/3 flex flex-col bg-gray-800 rounded-xl shadow-lg">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">Pending Items ({pendingProducts.length})</h2>
                        {pendingProducts.length > 0 && (
                            <button
                                onClick={handleSelectAllClick}
                                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded"
                            >
                                {areAllSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>
                    <div className="flex-grow p-4 overflow-y-auto space-y-2">
                        {pendingProducts.map(product => (
                            <div key={product.id} className={`p-3 rounded-lg flex items-center cursor-pointer transition-colors ${selectedProducts.has(product.id) ? 'bg-cyan-800' : 'bg-gray-700/50 hover:bg-gray-700'}`} onClick={() => toggleProductSelection(product.id)}>
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.has(product.id)}
                                    readOnly
                                    className="w-5 h-5 bg-gray-600 border-gray-500 rounded text-cyan-500 focus:ring-cyan-600 mr-4 pointer-events-none"
                                />
                                <span className="font-mono text-gray-300">{product.serialNumber}</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-700">
                        <button 
                            disabled={selectedProducts.size === 0}
                            onClick={handleStartSelected}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Start Work on Selected ({selectedProducts.size})
                        </button>
                    </div>
                </div>

                {/* Right Panel: Active Batch */}
                <div className="w-2/3 flex flex-col bg-gray-800 rounded-xl shadow-lg">
                     <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">My Active Batch ({activeBatch.length})</h2>
                         {activeBatch.length > 0 && (
                            <button
                                onClick={handleSelectAllActiveClick}
                                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded"
                            >
                                {areAllActiveSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>
                     <div className="flex-grow p-4 overflow-y-auto space-y-3">
                         {activeBatch.map(product => (
                            <div 
                                key={product.id} 
                                className={`p-4 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${selectedActiveProducts.has(product.id) ? 'bg-blue-800' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                                onClick={() => toggleActiveProductSelection(product.id)}
                            >
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedActiveProducts.has(product.id)}
                                        readOnly
                                        className="w-5 h-5 bg-gray-600 border-gray-500 rounded text-blue-500 focus:ring-blue-600 mr-4 pointer-events-none"
                                    />
                                    <span className="font-mono text-lg text-white">{product.serialNumber}</span>
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={(e) => { e.stopPropagation(); onPassProducts([product.id], stage.id); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm">Pass</button>
                                    <button onClick={(e) => { e.stopPropagation(); setFailingProduct(product); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm">Fail</button>
                                </div>
                            </div>
                         ))}
                    </div>
                    <div className="p-4 border-t border-gray-700">
                        <button
                            disabled={selectedActiveProducts.size === 0}
                            onClick={handlePassSelected}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Pass Selected ({selectedActiveProducts.size})
                        </button>
                    </div>
                </div>
            </main>
            <footer className="bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                <div className="p-2 bg-gray-700/50">
                     <h3 className="text-md font-bold text-gray-300">Work Instructions</h3>
                </div>
                <div className="flex-grow">
                    {stage.instruction_file ? (
                        <iframe src={stage.instruction_file} className="w-full h-full border-0" title="Work Instructions"></iframe>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>No work instructions available for this stage.</p>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
};