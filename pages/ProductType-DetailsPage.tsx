import React, { useState } from 'react';
import { ProductType, ProductionStage } from '../types';

interface ProductTypeDetailsPageProps {
  productType: ProductType;
  stages: ProductionStage[];
  onAddStages: (productTypeId: number, stagesText: string) => void;
}

const InfoCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-lg font-semibold text-white">{value}</div>
    </div>
);

const StagesTable: React.FC<{ stages: ProductionStage[] }> = ({ stages }) => {
    const sortedStages = [...stages].sort((a,b) => a.sequenceOrder - b.sequenceOrder);
    return (
         <div className="bg-gray-800 rounded-xl shadow-lg max-h-96 overflow-y-auto">
            <table className="min-w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-24 text-center">Sequence</th>
                        <th scope="col" className="px-6 py-3">Stage Name</th>
                        <th scope="col" className="px-6 py-3">Description</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {sortedStages.map(stage => (
                        <tr key={stage.id} className="hover:bg-gray-700/50 transition-colors duration-200">
                            <td className="px-6 py-4 text-center font-mono">{stage.sequenceOrder}</td>
                            <td className="px-6 py-4 font-medium text-white">{stage.stageName}</td>
                            <td className="px-6 py-4">{stage.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface StageImporterProps {
    productTypeId: number;
    pastedText: string;
    setPastedText: (text: string) => void;
    onAddStages: (productTypeId: number, stagesText: string) => void;
}

const StageImporter: React.FC<StageImporterProps> = ({ productTypeId, pastedText, setPastedText, onAddStages }) => {
    const handleImport = () => {
        if (!pastedText.trim()) {
            alert('Please paste data into the text area.');
            return;
        }
        onAddStages(productTypeId, pastedText);
        setPastedText('');
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-2">Import Stages</h3>
            <p className="text-sm text-gray-400 mb-4">
                Paste data from a spreadsheet (e.g., Excel, Google Sheets) with columns for Sequence, Name, and Description. Columns should be separated by a Tab.
            </p>
            <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={8}
                placeholder={"1\tComponent Prep\tPrepare and verify all components.\n2\tSub-Assembly\tAssemble the core sub-unit."}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            />
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleImport}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center"
                >
                    Import Stages
                </button>
            </div>
        </div>
    )
}

export const ProductTypeDetailsPage: React.FC<ProductTypeDetailsPageProps> = ({ productType, stages, onAddStages }) => {
  const [pastedText, setPastedText] = useState('');
  
  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.hash = '#/product-types';
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
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
            <StagesTable stages={stages} />
        </div>
        <div>
            <StageImporter 
                productTypeId={productType.id} 
                onAddStages={onAddStages}
                pastedText={pastedText}
                setPastedText={setPastedText}
            />
        </div>
      </div>
    </div>
  );
};