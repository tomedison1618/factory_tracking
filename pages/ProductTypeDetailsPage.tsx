import React, { useState, useEffect, useRef } from 'react';
import { ProductType, ProductionStage, Job } from '../types';

interface ProductTypeDetailsPageProps {
  productType: ProductType;
  stages: ProductionStage[];
  jobs: Job[];
  onAddStage: (productTypeId: number, newStageData: Omit<ProductionStage, 'id' | 'productTypeId'>) => void;
  onUpdateStage: (updatedStage: ProductionStage) => void;
  onDeleteStage: (stageId: number) => void;
  onBulkAddStages: (productTypeId: number, newStages: Omit<ProductionStage, 'id' | 'productTypeId'>[]) => void;
}

const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-lg font-semibold text-white">{value}</div>
    </div>
);

const EditStageModal: React.FC<{ stage: ProductionStage; onSave: (stage: ProductionStage) => void; onCancel: () => void; }> = ({ stage, onSave, onCancel }) => {
    const [formData, setFormData] = useState(stage);

    useEffect(() => {
        setFormData(stage);
    }, [stage]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'sequenceOrder' ? parseInt(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 text-white">Edit Stage</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="sequenceOrder" className="block text-sm font-medium text-gray-300 mb-1">Sequence</label>
                        <input type="number" name="sequenceOrder" id="sequenceOrder" value={formData.sequenceOrder} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 transition"/>
                    </div>
                    <div>
                        <label htmlFor="stageName" className="block text-sm font-medium text-gray-300 mb-1">Stage Name</label>
                        <input type="text" name="stageName" id="stageName" value={formData.stageName} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 transition"/>
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 transition"/>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StagesTable: React.FC<{ stages: ProductionStage[]; onEdit: (stage: ProductionStage) => void; onDelete: (stageId: number) => void; isLocked: boolean; }> = ({ stages, onEdit, onDelete, isLocked }) => {
    const sortedStages = [...stages].sort((a,b) => a.sequenceOrder - b.sequenceOrder);
    return (
         <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-24 text-center">Sequence</th>
                        <th scope="col" className="px-6 py-3">Stage Name</th>
                        <th scope="col" className="px-6 py-3">Description</th>
                        {!isLocked && <th scope="col" className="px-6 py-3 text-center">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {sortedStages.map(stage => (
                        <tr key={stage.id} className="hover:bg-gray-700/50 transition-colors duration-200 group">
                            <td className="px-6 py-4 text-center font-mono">{stage.sequenceOrder}</td>
                            <td className="px-6 py-4 font-medium text-white">{stage.stageName}</td>
                            <td className="px-6 py-4">{stage.description}</td>
                            {!isLocked && (
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(stage)} className="text-blue-400 hover:text-blue-300 p-1" title="Edit Stage">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => onDelete(stage.id)} className="text-red-400 hover:text-red-300 p-1" title="Delete Stage">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AddStageForm: React.FC<{ productTypeId: number; onAddStage: ProductTypeDetailsPageProps['onAddStage'] }> = ({ productTypeId, onAddStage }) => {
    const [sequenceOrder, setSequenceOrder] = useState('');
    const [stageName, setStageName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sequenceOrder || !stageName) {
            alert('Please provide at least a sequence and a name.');
            return;
        }
        onAddStage(productTypeId, {
            sequenceOrder: parseInt(sequenceOrder),
            stageName,
            description,
        });
        setSequenceOrder('');
        setStageName('');
        setDescription('');
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">Add New Stage</h3>
            <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
                <div>
                    <label htmlFor="new-sequence" className="block text-sm font-medium text-gray-400 mb-1">Sequence</label>
                    <input type="number" id="new-sequence" value={sequenceOrder} onChange={e => setSequenceOrder(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-cyan-500 disabled:opacity-50"/>
                </div>
                <div>
                    <label htmlFor="new-name" className="block text-sm font-medium text-gray-400 mb-1">Stage Name</label>
                    <input type="text" id="new-name" value={stageName} onChange={e => setStageName(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-cyan-500 disabled:opacity-50"/>
                </div>
                <div>
                    <label htmlFor="new-desc" className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                    <input type="text" id="new-desc" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:ring-cyan-500 disabled:opacity-50"/>
                </div>
                <div className="flex-grow"></div>
                <div>
                    <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center text-sm disabled:bg-gray-600 disabled:cursor-not-allowed">
                        Add Stage
                    </button>
                </div>
            </form>
        </div>
    );
};

const ExcelStageImporter: React.FC<{ onImport: (stages: Omit<ProductionStage, 'id' | 'productTypeId'>[]) => void }> = ({ onImport }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = (window as any).XLSX.utils.sheet_to_json(worksheet);
                
                const newStages: Omit<ProductionStage, 'id' | 'productTypeId'>[] = json.map((row: any) => {
                    const sequenceKey = Object.keys(row).find(k => k.toLowerCase() === 'sequence' || k.toLowerCase() === 'sequenceorder');
                    const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name' || k.toLowerCase() === 'stagename');
                    const descKey = Object.keys(row).find(k => k.toLowerCase() === 'description');

                    if (sequenceKey === undefined || nameKey === undefined) {
                        throw new Error('Each row must have at least "Sequence" and "Name" columns.');
                    }

                    return {
                        sequenceOrder: parseInt(row[sequenceKey]),
                        stageName: String(row[nameKey]),
                        description: descKey ? String(row[descKey]) : '',
                    };
                }).filter((stage: any) => !isNaN(stage.sequenceOrder) && stage.stageName);

                if (newStages.length > 0) {
                    onImport(newStages);
                    alert(`${newStages.length} stages imported successfully!`);
                } else {
                    alert('No valid stages found in the file. Please ensure the format is correct with "Sequence", "Name", and optional "Description" columns.');
                }
            } catch (error) {
                console.error("Error parsing Excel file:", error);
                alert(`Failed to import file. Please check the file format and column headers. Error: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                if(fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold mb-2">Import Stages from File</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Select an Excel (.xlsx, .xls) file. The first sheet should contain columns for "Sequence", "Name", and "Description" (optional).
                </p>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            />
            <button
                onClick={handleButtonClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Import from Excel
            </button>
        </div>
    );
};

export const ProductTypeDetailsPage: React.FC<ProductTypeDetailsPageProps> = ({ productType, stages, jobs, onAddStage, onUpdateStage, onDeleteStage, onBulkAddStages }) => {
  const [editingStage, setEditingStage] = useState<ProductionStage | null>(null);

  const isWorkflowLocked = jobs.some(job => job.productType.id === productType.id && job.status === 'Completed');

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.hash = '#/product-types';
  };

  const handleSaveStage = (updatedStage: ProductionStage) => {
    onUpdateStage(updatedStage);
    setEditingStage(null);
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      {editingStage && (
        <EditStageModal 
            stage={editingStage}
            onSave={handleSaveStage}
            onCancel={() => setEditingStage(null)}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">
          Product Type: <span className="text-cyan-400">{productType.typeName}</span>
        </h1>
        <a 
            href="#/product-types" 
            onClick={handleBackClick}
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center text-sm"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Product Types List
        </a>
      </div>

      <div className="bg-gray-800 rounded-xl shadow-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard label="Type Name" value={productType.typeName} />
            <InfoCard label="Part Number" value={<span className="font-mono">{productType.partNumber}</span>} />
            <InfoCard label="Number of Stages" value={stages.length} />
        </div>
      </div>

      <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-200">Production Stages</h2>
             {isWorkflowLocked && (
                <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-lg mb-4 text-sm" role="alert">
                    <div className="flex">
                        <div>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.242-1.21 2.878 0l5.394 10.273c.636 1.21-.213 2.628-1.439 2.628H4.302c-1.226 0-2.075-1.418-1.439-2.628L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold">Workflow Locked</p>
                            <p>This Product Type is in use by one or more completed jobs. To protect data integrity, its production stages cannot be modified. To make changes, please create a new Product Type with the desired workflow.</p>
                        </div>
                    </div>
                </div>
            )}
            <StagesTable stages={stages} onEdit={setEditingStage} onDelete={onDeleteStage} isLocked={isWorkflowLocked} />
        </div>
        <fieldset disabled={isWorkflowLocked}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AddStageForm productTypeId={productType.id} onAddStage={onAddStage} />
                <ExcelStageImporter onImport={(newStages) => onBulkAddStages(productType.id, newStages)} />
            </div>
        </fieldset>
      </div>
    </div>
  );
};