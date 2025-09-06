import React, { useState } from 'react';

interface CreateProductTypePageProps {
  onCreateProductType: (typeName: string, partNumber: string) => void;
}

export const CreateProductTypePage: React.FC<CreateProductTypePageProps> = ({ onCreateProductType }) => {
  const [typeName, setTypeName] = useState('');
  const [partNumber, setPartNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName || !partNumber) {
        alert('Please fill out all fields.');
        return;
    }
    onCreateProductType(typeName, partNumber);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.location.hash = path;
  };

  return (
    <div className="p-8 h-full overflow-y-auto flex items-center justify-center">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Create New Product Type</h1>
            <a href="#/product-types" title="Back to Product Types List" onClick={(e) => handleLinkClick(e, '#/product-types')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </a>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="typeName" className="block text-sm font-medium text-gray-300 mb-2">Type Name</label>
            <input type="text" id="typeName" value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g., Model C Gizmo" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" required />
          </div>

          <div>
            <label htmlFor="partNumber" className="block text-sm font-medium text-gray-300 mb-2">Part Number</label>
            <input type="text" id="partNumber" value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="e.g., GZM-C-001" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" required />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <a href="#/product-types" onClick={(e) => handleLinkClick(e, '#/product-types')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 cursor-pointer">
              Cancel
            </a>
            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Create Product Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};