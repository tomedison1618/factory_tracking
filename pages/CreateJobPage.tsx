import React, { useState, useEffect } from 'react';
import { Job, ProductType, CreateJobRequest } from '../types';

interface CreateJobPageProps {
  productTypes: ProductType[];
  onCreateJob: (jobData: CreateJobRequest) => void;
  jobs: Job[];
}

export const CreateJobPage: React.FC<CreateJobPageProps> = ({ productTypes, onCreateJob, jobs }) => {
  const [docketNumber, setDocketNumber] = useState('');
  const [productTypeId, setProductTypeId] = useState(productTypes[0]?.id.toString() || '');
  const [quantity, setQuantity] = useState('');
  const [priority, setPriority] = useState('3');
  const [dueDate, setDueDate] = useState('');
  const [serialSuffixStart, setSerialSuffixStart] = useState('001');
  const [serialSuffixError, setSerialSuffixError] = useState('');
  const [docketError, setDocketError] = useState('');

  useEffect(() => {
    const trimmedDocket = docketNumber.trim();
    if (trimmedDocket && jobs.some(job => job.docketNumber.toLowerCase() === trimmedDocket.toLowerCase())) {
        setDocketError('A job with this docket number already exists.');
    } else {
        setDocketError('');
    }
  }, [docketNumber, jobs]);

  useEffect(() => {
    const trimmedSuffix = serialSuffixStart.trim();
    if (!trimmedSuffix) {
        setSerialSuffixError('Product serial suffix is required.');
    } else if (!/^\d+$/.test(trimmedSuffix)) {
        setSerialSuffixError('Product serial suffix must contain only numbers.');
    } else {
        setSerialSuffixError('');
    }
  }, [serialSuffixStart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (docketError || serialSuffixError) {
        return;
    }
      
    const trimmedDocket = docketNumber.trim();
    const trimmedSuffixStart = serialSuffixStart.trim();
    if (!trimmedDocket || !productTypeId || !quantity || !dueDate || !trimmedSuffixStart) {
        alert('Please fill out all fields.');
        return;
    }

    const selectedProductType = productTypes.find(pt => pt.id === parseInt(productTypeId, 10));
    if (!selectedProductType) {
        alert('Invalid Product Type selected.');
        return;
    }
    
    onCreateJob({
      docketNumber: trimmedDocket,
      quantity: parseInt(quantity, 10),
      priority: parseInt(priority, 10),
      dueDate,
      productType: selectedProductType,
      serialSuffixStart: trimmedSuffixStart,
    });
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.location.hash = path;
  };

  return (
    <div className="p-8 h-full overflow-y-auto flex items-center justify-center">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Create New Job</h1>
            <a href="#/jobs" title="Back to Jobs List" onClick={(e) => handleLinkClick(e, '#/jobs')} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </a>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="docketNumber" className="block text-sm font-medium text-gray-300 mb-2">Docket Number</label>
            <input 
                type="text" 
                id="docketNumber" 
                value={docketNumber} 
                onChange={e => setDocketNumber(e.target.value)} 
                className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:border-cyan-500 transition ${docketError ? 'border-red-500 ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500'}`} 
                required 
            />
            {docketError && <p className="mt-2 text-sm text-red-400">{docketError}</p>}
          </div>

          <div>
            <label htmlFor="productType" className="block text-sm font-medium text-gray-300 mb-2">Product Type</label>
            <select id="productType" value={productTypeId} onChange={e => setProductTypeId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" required>
              {productTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.typeName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
              <input type="number" id="quantity" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" min="1" required />
            </div>

            <div>
              <label htmlFor="serialSuffixStart" className="block text-sm font-medium text-gray-300 mb-2">Product Serial Start</label>
              <input
                type="text"
                id="serialSuffixStart"
                value={serialSuffixStart}
                onChange={e => setSerialSuffixStart(e.target.value)}
                className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition ${serialSuffixError ? 'border-red-500 ring-red-500/50' : 'border-gray-600'}`}
                inputMode="numeric"
                pattern="\d*"
                placeholder="001"
                required
              />
              {serialSuffixError && <p className="mt-2 text-sm text-red-400">{serialSuffixError}</p>}
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select id="priority" value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" required>
                <option value="1">High</option>
                <option value="2">Medium</option>
                <option value="3">Normal</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
            <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" required />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <a href="#/jobs" onClick={(e) => handleLinkClick(e, '#/jobs')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 cursor-pointer">
              Cancel
            </a>
            <button 
                type="submit"
                disabled={!!docketError || !!serialSuffixError} 
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
