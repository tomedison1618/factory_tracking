import React from 'react';
import { ProductType } from '../types';

interface ProductTypesListPageProps {
    productTypes: ProductType[];
}

export const ProductTypesListPage: React.FC<ProductTypesListPageProps> = ({ productTypes }) => {
    
    const handleTypeClick = (typeId: number) => {
        window.location.hash = `#/product-types/${typeId}`;
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Product Types</h1>
                <a 
                    href="#/product-types/new" 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/product-types/new'; }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create New Type
                </a>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                <table className="min-w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                        <tr>
                            <th scope="col" className="px-6 py-3">Type Name</th>
                            <th scope="col" className="px-6 py-3">Part Number</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {productTypes.map(pt => (
                            <tr key={pt.id} className="hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer" onClick={() => handleTypeClick(pt.id)}>
                                <td className="px-6 py-4 font-medium text-white">{pt.typeName}</td>
                                <td className="px-6 py-4 font-mono">{pt.partNumber}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};