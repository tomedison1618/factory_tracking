import React, { useState } from 'react';
import { Product } from '../types';

interface StageProductCellProps {
    products: Product[];
}

export const StageProductCell: React.FC<StageProductCellProps> = ({ products }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const MAX_VISIBLE = 2;

    if (products.length === 0) {
        return null;
    }

    const visibleProducts = isExpanded ? products : products.slice(0, MAX_VISIBLE);
    const hiddenCount = products.length - visibleProducts.length;

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.location.hash = path;
    };

    return (
        <div className="p-2 space-y-2">
            {products.length > 0 && (
                <div>
                    <p className="text-xs text-gray-400 mb-1 font-semibold">{products.length} Product{products.length > 1 ? 's' : ''}</p>
                    <ul className="space-y-1">
                        {visibleProducts.map(product => (
                            <li key={product.id}>
                                <a 
                                    href={`#/products/${product.id}/traveler`}
                                    onClick={(e) => handleLinkClick(e, `#/products/${product.id}/traveler`)}
                                    className="block bg-gray-700/50 hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 rounded px-2 py-1 text-xs font-mono transition-colors truncate"
                                    title={product.serialNumber}
                                >
                                    {product.serialNumber}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-between items-center">
                        {hiddenCount > 0 && (
                            <button 
                                onClick={() => setIsExpanded(true)}
                                className="text-xs text-blue-400 hover:underline"
                            >
                                ... and {hiddenCount} more
                            </button>
                        )}
                        {isExpanded && (
                             <button 
                                onClick={() => setIsExpanded(false)}
                                className="text-xs text-blue-400 hover:underline"
                            >
                                Show less
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};