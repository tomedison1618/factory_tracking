import React, { useState, useMemo } from 'react';
import { Job, Product, StageEvent, ProductStageLink, StageEventStatus, User, UserRole, ProductionStage, ProductType } from '../types';
import { ChartRenderer, ChartData } from '../components/ChartRenderer';

interface JobReportRow {
    jobId: number;
    docketNumber: string;
    productType: string;
    quantity: number;
    dueDate: string;
    completionDate: string;
    durationDays: number;
    onTimeStatus: 'Early' | 'On Time' | 'Late';
    totalFails: number;
    scrappedCount: number;
}

interface TechnicianReportRow {
    technicianId: number;
    technicianName: string;
    totalItemsProcessed: number;
    passCount: number;
    failCount: number;
    qualityRate: number;
    avgTimeMinutes: number;
    performanceVsAverage: number;
}

interface PerformanceByStage {
    stageId: number;
    stageName: string;
    technicians: TechnicianReportRow[];
}

interface FailureLogDetail {
    id: number;
    date: string;
    serialNumber: string;
    productType: string;
    productTypeId: number;
    docketNumber: string;
    stageName: string;
    stageId: number;
    technician: string;
    notes: string;
}

interface FailureSummaryItem {
    name: string;
    count: number;
}


const getDayDifference = (date1: Date, date2: Date): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const OnTimeStatusBadge: React.FC<{ status: JobReportRow['onTimeStatus'] }> = ({ status }) => {
    const styles = {
        'Early': 'bg-green-500/20 text-green-300',
        'On Time': 'bg-blue-500/20 text-blue-300',
        'Late': 'bg-red-500/20 text-red-300',
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
}

const QualityRateBadge: React.FC<{ rate: number }> = ({ rate }) => {
    let styles = 'bg-red-500/20 text-red-300';
    if (rate >= 98) {
        styles = 'bg-green-500/20 text-green-300';
    } else if (rate >= 95) {
        styles = 'bg-yellow-500/20 text-yellow-300';
    }
    
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles}`}>{rate.toFixed(1)}%</span>;
};

const PerformanceIndicatorBadge: React.FC<{ value: number; avgTime: number }> = ({ value, avgTime }) => {
    if (avgTime === 0) {
        return <span className="text-gray-500">-</span>;
    }
    if (Math.abs(value) < 0.1) {
         return <span className="text-gray-400">Avg</span>;
    }

    const isFaster = value > 0;
    const color = isFaster ? 'text-green-400' : 'text-red-400';
    const sign = isFaster ? '+' : '';
    const text = isFaster ? 'faster' : 'slower';

    return (
        <span className={`font-semibold ${color}`}>
            {`${sign}${value.toFixed(0)}% ${text}`}
        </span>
    );
};

const FilterDropdown: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <select value={value} onChange={onChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);


export const ReportsPage: React.FC<{
    jobs: Job[];
    products: Product[];
    stageEvents: StageEvent[];
    productStageLinks: ProductStageLink[];
    users: User[];
    productionStages: ProductionStage[];
    productTypes: ProductType[];
}> = ({ jobs, products, stageEvents, productStageLinks, users, productionStages, productTypes }) => {
    
    const [activeTab, setActiveTab] = useState<'completion' | 'performance' | 'failure'>('completion');
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    // Filter states
    const [jobProductTypeFilter, setJobProductTypeFilter] = useState('all');
    const [jobOnTimeStatusFilter, setJobOnTimeStatusFilter] = useState('all');
    const [techStageFilter, setTechStageFilter] = useState('all');
    const [failureStageFilter, setFailureStageFilter] = useState('all');
    const [failureProductTypeFilter, setFailureProductTypeFilter] = useState('all');

    const jobReportData = useMemo((): JobReportRow[] => {
        const completedJobs = jobs.filter(j => j.status === 'Completed');
        const reportRows: JobReportRow[] = [];

        for (const job of completedJobs) {
            const productsForJob = products.filter(p => p.jobId === job.id);
            if (productsForJob.length === 0) continue;
            
            const productIds = new Set(productsForJob.map(p => p.id));
            
            const linksForJobProducts = productStageLinks.filter(l => productIds.has(l.productId));
            const linkIdsForJob = new Set(linksForJobProducts.map(l => l.id));
            
            const eventsForJob = stageEvents
                .filter(e => linkIdsForJob.has(e.productStageLinkId))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            if (eventsForJob.length === 0) continue;

            const jobStartDate = new Date(eventsForJob[0].timestamp);
            const jobCompletionDate = new Date(eventsForJob[eventsForJob.length - 1].timestamp);

            const filterStart = new Date(startDate);
            const filterEnd = new Date(endDate);
            filterStart.setHours(0,0,0,0);
            filterEnd.setHours(23, 59, 59, 999);

            if (jobCompletionDate < filterStart || jobCompletionDate > filterEnd) {
                continue;
            }

            const durationDays = getDayDifference(jobStartDate, jobCompletionDate);
            const dueDate = new Date(job.dueDate);

            const onTimeDiff = getDayDifference(dueDate, jobCompletionDate);
            let onTimeStatus: JobReportRow['onTimeStatus'];
            if (onTimeDiff > 0) {
                onTimeStatus = 'Late';
            } else if (onTimeDiff < 0) {
                onTimeStatus = 'Early';
            } else {
                onTimeStatus = 'On Time';
            }
            
            const failedProductIds = new Set<number>();
            eventsForJob.forEach(event => {
                if (event.status === StageEventStatus.FAILED) {
                    const link = linksForJobProducts.find(l => l.id === event.productStageLinkId);
                    if (link) {
                        failedProductIds.add(link.productId);
                    }
                }
            });

            const scrappedCount = productsForJob.filter(p => p.status === 'Scrapped').length;

            reportRows.push({
                jobId: job.id,
                docketNumber: job.docketNumber,
                productType: job.productType.typeName,
                quantity: job.quantity,
                dueDate: formatDate(dueDate),
                completionDate: formatDate(jobCompletionDate),
                durationDays: durationDays <= 0 ? 1 : durationDays,
                onTimeStatus,
                totalFails: failedProductIds.size,
                scrappedCount,
            });
        }
        
        return reportRows.filter(row => {
            const productTypeMatch = jobProductTypeFilter === 'all' || row.productType === (productTypes.find(pt => pt.id.toString() === jobProductTypeFilter)?.typeName);
            const onTimeStatusMatch = jobOnTimeStatusFilter === 'all' || row.onTimeStatus.toLowerCase().replace(' ', '') === jobOnTimeStatusFilter;
            return productTypeMatch && onTimeStatusMatch;
        }).sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());
    }, [jobs, products, stageEvents, productStageLinks, startDate, endDate, jobProductTypeFilter, jobOnTimeStatusFilter, productTypes]);

    const technicianPerformanceByStage = useMemo((): PerformanceByStage[] => {
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);
        filterStart.setHours(0, 0, 0, 0);
        filterEnd.setHours(23, 59, 59, 999);

        const eventsInDateRange = stageEvents.filter(e => {
            const eventDate = new Date(e.timestamp);
            return eventDate >= filterStart && eventDate <= filterEnd;
        });

        const linkIdToStageIdMap = new Map(productStageLinks.map(l => [l.id, l.productionStageId]));
        const linkIdToProductIdMap = new Map(productStageLinks.map(l => [l.id, l.productId]));
        const stageIdToStageMap = new Map(productionStages.map(s => [s.id, s]));

        const eventsByStageAndTech = new Map<number, Map<number, StageEvent[]>>();

        for (const event of eventsInDateRange) {
            const stageId = linkIdToStageIdMap.get(event.productStageLinkId);
            if (stageId === undefined || !stageIdToStageMap.has(stageId)) continue;

            if (!eventsByStageAndTech.has(stageId)) {
                eventsByStageAndTech.set(stageId, new Map());
            }
            const stageMap = eventsByStageAndTech.get(stageId)!;
            const techId = event.userId;
            if (!stageMap.has(techId)) {
                stageMap.set(techId, []);
            }
            stageMap.get(techId)!.push(event);
        }

        const reportData: PerformanceByStage[] = [];
        const techMap = new Map(users.filter(u => u.role === UserRole.TECHNICIAN).map(t => [t.id, t]));

        for (const [stageId, techEventsMap] of eventsByStageAndTech.entries()) {
            const stage = stageIdToStageMap.get(stageId);
            if (!stage) continue;
            
            const allStartEventsForStage = Array.from(techEventsMap.values()).flat().filter(e => e.status === StageEventStatus.STARTED && e.durationSeconds != null);
            const totalStageDuration = allStartEventsForStage.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
            const stageAverageMinutes = allStartEventsForStage.length > 0 ? (totalStageDuration / allStartEventsForStage.length) / 60 : 0;

            const technicianRows: TechnicianReportRow[] = [];

            for (const [techId, techEvents] of techEventsMap.entries()) {
                const tech = techMap.get(techId);
                if (!tech) continue;

                const passEvents = techEvents.filter(e => e.status === StageEventStatus.PASSED);
                const failEvents = techEvents.filter(e => e.status === StageEventStatus.FAILED);
                const startEvents = techEvents.filter(e => e.status === StageEventStatus.STARTED && e.durationSeconds != null);

                if (passEvents.length === 0 && failEvents.length === 0) continue;

                const passCount = passEvents.length;
                const failCount = failEvents.length;

                const processedProductIds = new Set(passEvents.map(e => linkIdToProductIdMap.get(e.productStageLinkId)));
                const totalItemsProcessed = processedProductIds.size;

                const totalRatedActions = passCount + failCount;
                const qualityRate = totalRatedActions > 0 ? (passCount / totalRatedActions) * 100 : 100;

                const totalDurationSeconds = startEvents.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
                const avgTimeSeconds = startEvents.length > 0 ? totalDurationSeconds / startEvents.length : 0;
                const avgTimeMinutes = avgTimeSeconds / 60;
                
                let performanceVsAverage = 0;
                if (stageAverageMinutes > 0 && avgTimeMinutes > 0) {
                    performanceVsAverage = ((stageAverageMinutes - avgTimeMinutes) / stageAverageMinutes) * 100;
                }

                technicianRows.push({
                    technicianId: tech.id,
                    technicianName: tech.username,
                    totalItemsProcessed,
                    passCount,
                    failCount,
                    qualityRate,
                    avgTimeMinutes,
                    performanceVsAverage,
                });
            }

            if (technicianRows.length > 0) {
                reportData.push({
                    stageId,
                    stageName: stage.stageName,
                    technicians: technicianRows.sort((a, b) => b.passCount - a.passCount),
                });
            }
        }
        
        return reportData.filter(stageData => {
            return techStageFilter === 'all' || stageData.stageId.toString() === techStageFilter;
        }).sort((a, b) => a.stageName.localeCompare(b.stageName));
    }, [users, stageEvents, productStageLinks, productionStages, startDate, endDate, techStageFilter]);

    const failureReportData = useMemo(() => {
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);
        filterStart.setHours(0, 0, 0, 0);
        filterEnd.setHours(23, 59, 59, 999);

        const failedEvents = stageEvents.filter(e => {
            const eventDate = new Date(e.timestamp);
            return e.status === StageEventStatus.FAILED && eventDate >= filterStart && eventDate <= filterEnd;
        });

        const linkMap = new Map(productStageLinks.map(l => [l.id, l]));
        const productMap = new Map(products.map(p => [p.id, p]));
        const jobMap = new Map(jobs.map(j => [j.id, j]));
        const stageMap = new Map(productionStages.map(s => [s.id, s]));
        const userMap = new Map(users.map(u => [u.id, u]));

        const detailedLog: FailureLogDetail[] = failedEvents.map(event => {
            const link = linkMap.get(event.productStageLinkId);
            if (!link) return null;

            const product = productMap.get(link.productId);
            if (!product) return null;

            const job = jobMap.get(product.jobId);
            if (!job) return null;

            const stage = stageMap.get(link.productionStageId);
            if (!stage) return null;

            const user = userMap.get(event.userId);

            return {
                id: event.id,
                date: new Date(event.timestamp).toLocaleString(),
                serialNumber: product.serialNumber,
                productType: job.productType.typeName,
                productTypeId: job.productType.id,
                docketNumber: job.docketNumber,
                stageName: stage.stageName,
                stageId: stage.id,
                technician: user ? user.username : 'Unknown',
                notes: event.notes || '',
            };
        }).filter((item): item is FailureLogDetail => {
            if (!item) return false;
            const stageMatch = failureStageFilter === 'all' || item.stageId.toString() === failureStageFilter;
            const productTypeMatch = failureProductTypeFilter === 'all' || item.productTypeId.toString() === failureProductTypeFilter;
            return stageMatch && productTypeMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const failuresByStage = new Map<number, { name: string; count: number }>();
        const failuresByProductType = new Map<number, { name: string; count: number }>();
        const failuresByReason = new Map<string, number>();

        detailedLog.forEach(log => {
            const stageEntry = failuresByStage.get(log.stageId) || { name: log.stageName, count: 0 };
            stageEntry.count++;
            failuresByStage.set(log.stageId, stageEntry);

            const productTypeEntry = failuresByProductType.get(log.productTypeId) || { name: log.productType, count: 0 };
            productTypeEntry.count++;
            failuresByProductType.set(log.productTypeId, productTypeEntry);

            try {
                const notes = JSON.parse(log.notes);
                if (notes && Array.isArray(notes.reasons)) {
                    notes.reasons.forEach((reason: string) => {
                        failuresByReason.set(reason, (failuresByReason.get(reason) || 0) + 1);
                    });
                }
            } catch (e) {
                const reason = "Uncategorized";
                failuresByReason.set(reason, (failuresByReason.get(reason) || 0) + 1);
            }
        });
        
        const stageSummary = Array.from(failuresByStage.values()).sort((a, b) => b.count - a.count);
        const productTypeSummary = Array.from(failuresByProductType.values()).sort((a, b) => b.count - a.count);
        const reasonSummary = Array.from(failuresByReason.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const reasonChartData: ChartData = {
            type: 'pie',
            title: 'Failure Analysis by Reason',
            data: {
                labels: reasonSummary.map(r => r.name),
                datasets: [{
                    label: 'Failure Count',
                    data: reasonSummary.map(r => r.count),
                }]
            }
        };

        const totalFailures = detailedLog.length;

        return { detailedLog, stageSummary, productTypeSummary, totalFailures, reasonSummary, reasonChartData };
    }, [jobs, products, stageEvents, productStageLinks, users, productionStages, startDate, endDate, failureStageFilter, failureProductTypeFilter]);

    const handleExportJobs = () => {
        if (jobReportData.length === 0) {
            alert('No data to export for the selected date range.');
            return;
        }
        const worksheet = (window as any).XLSX.utils.json_to_sheet(jobReportData.map(row => ({
            "Docket Number": row.docketNumber,
            "Product Type": row.productType,
            "Quantity": row.quantity,
            "Due Date": row.dueDate,
            "Completion Date": row.completionDate,
            "Duration (Days)": row.durationDays,
            "Status": row.onTimeStatus,
            "Products with Failures": row.totalFails,
            "Products Scrapped": row.scrappedCount,
        })));
        const workbook = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Job Completion Report");
        (window as any).XLSX.writeFile(workbook, `JobCompletionReport_${startDate}_to_${endDate}.xlsx`);
    };
    
    const handleExportTechnicians = () => {
        const flatData = technicianPerformanceByStage.flatMap(stageData =>
            stageData.technicians.map(techRow => {
                let performanceText = '-';
                if (techRow.avgTimeMinutes > 0) {
                    if (Math.abs(techRow.performanceVsAverage) < 0.1) {
                         performanceText = 'Average';
                    } else {
                        const sign = techRow.performanceVsAverage > 0 ? '+' : '';
                        performanceText = `${sign}${techRow.performanceVsAverage.toFixed(1)}%`;
                    }
                }
                
                return {
                    "Stage": stageData.stageName,
                    "Technician": techRow.technicianName,
                    "Total Unique Items Passed": techRow.totalItemsProcessed,
                    "Passed Operations": techRow.passCount,
                    "Failed Operations": techRow.failCount,
                    "Quality Rate (%)": techRow.qualityRate.toFixed(2),
                    "Avg. Time per Operation (min)": techRow.avgTimeMinutes > 0 ? techRow.avgTimeMinutes.toFixed(2) : '-',
                    "Performance vs. Stage Avg.": performanceText,
                };
            })
        );

        if (flatData.length === 0) {
            alert('No technician data to export for the selected date range.');
            return;
        }
        const worksheet = (window as any).XLSX.utils.json_to_sheet(flatData);
        const workbook = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Technician Performance");
        (window as any).XLSX.writeFile(workbook, `TechnicianPerformanceReport_${startDate}_to_${endDate}.xlsx`);
    };
    
    const handleExportFailures = () => {
        if (failureReportData.detailedLog.length === 0) {
            alert('No failure data to export for the selected date range.');
            return;
        }
        const worksheet = (window as any).XLSX.utils.json_to_sheet(failureReportData.detailedLog.map(row => ({
            "Date": row.date,
            "Serial Number": row.serialNumber,
            "Product Type": row.productType,
            "Job Docket": row.docketNumber,
            "Stage": row.stageName,
            "Technician": row.technician,
            "Notes": row.notes,
        })));
        const workbook = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Failure Analysis Report");
        (window as any).XLSX.writeFile(workbook, `FailureAnalysisReport_${startDate}_to_${endDate}.xlsx`);
    };

    const TabButton: React.FC<{tabName: 'completion' | 'performance' | 'failure', children: React.ReactNode}> = ({ tabName, children }) => {
        const isActive = activeTab === tabName;
        const baseClasses = "px-4 py-3 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px";
        const activeClasses = "text-cyan-400 border-cyan-400";
        const inactiveClasses = "text-gray-400 hover:text-white border-transparent";
        return (
            <button onClick={() => setActiveTab(tabName)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
                {children}
            </button>
        )
    };

    const SummaryCard: React.FC<{title: string, data: FailureSummaryItem[], total: number}> = ({ title, data, total }) => (
        <div className="w-1/3 bg-gray-700/30 p-4 rounded-lg">
            <h3 className="font-bold text-gray-300 mb-3">{title}</h3>
            {total > 0 ? (
                <ul className="space-y-3">
                    {data.map(item => (
                        <li key={item.name}>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-gray-300 truncate font-medium">{item.name}</span>
                                <span className="text-gray-400 font-mono">{item.count} failures</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-1.5">
                                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(item.count / total) * 100}%` }}></div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500">No data available.</p>
            )}
        </div>
    );

    const stageOptions = useMemo(() => [
        { value: 'all', label: 'All Stages' },
        ...productionStages.map(s => ({ value: s.id.toString(), label: `${s.stageName} (${productTypes.find(pt => pt.id === s.productTypeId)?.typeName})` }))
    ], [productionStages, productTypes]);

    const productTypeOptions = useMemo(() => [
        { value: 'all', label: 'All Product Types' },
        ...productTypes.map(pt => ({ value: pt.id.toString(), label: pt.typeName }))
    ], [productTypes]);

    return (
        <div className="p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-white mb-6">Reports</h1>
            
            <div className="border-b border-gray-700 mb-6">
                <nav className="flex space-x-4">
                    <TabButton tabName="completion">Job Completion</TabButton>
                    <TabButton tabName="performance">Technician Performance</TabButton>
                    <TabButton tabName="failure">Failure Analysis</TabButton>
                </nav>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 flex-grow flex flex-col overflow-auto">
                {activeTab === 'completion' && (
                    <>
                        <h2 className="text-xl font-bold mb-4">Job Completion Report</h2>
                        <div className="flex items-center justify-between space-x-4 mb-6 bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition"/>
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition"/>
                                </div>
                                <FilterDropdown
                                    label="Product Type"
                                    value={jobProductTypeFilter}
                                    onChange={e => setJobProductTypeFilter(e.target.value)}
                                    options={productTypeOptions}
                                />
                                <FilterDropdown
                                    label="Job Status"
                                    value={jobOnTimeStatusFilter}
                                    onChange={e => setJobOnTimeStatusFilter(e.target.value)}
                                    options={[
                                        { value: 'all', label: 'All Statuses' },
                                        { value: 'early', label: 'Early' },
                                        { value: 'ontime', label: 'On Time' },
                                        { value: 'late', label: 'Late' }
                                    ]}
                                />
                            </div>
                            <button onClick={handleExportJobs} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Export to Excel
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            <table className="min-w-full text-left text-sm text-gray-300">
                                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Docket Number</th>
                                        <th scope="col" className="px-6 py-3">Product Type</th>
                                        <th scope="col" className="px-6 py-3 text-center">Qty</th>
                                        <th scope="col" className="px-6 py-3">Due Date</th>
                                        <th scope="col" className="px-6 py-3">Completed On</th>
                                        <th scope="col" className="px-6 py-3 text-center">Duration</th>
                                        <th scope="col" className="px-6 py-3 text-center">Status</th>
                                        <th scope="col" className="px-6 py-3 text-center">Fails</th>
                                        <th scope="col" className="px-6 py-3 text-center">Scrapped</th>
                                    </tr>
                                </thead>
                                {jobReportData.length > 0 ? (
                                    <tbody className="divide-y divide-gray-700">
                                        {jobReportData.map(row => (
                                            <tr key={row.jobId} className="hover:bg-gray-700/50 transition-colors duration-200">
                                                <td className="px-6 py-4 font-medium text-white">{row.docketNumber}</td>
                                                <td className="px-6 py-4">{row.productType}</td>
                                                <td className="px-6 py-4 text-center">{row.quantity}</td>
                                                <td className="px-6 py-4">{row.dueDate}</td>
                                                <td className="px-6 py-4">{row.completionDate}</td>
                                                <td className="px-6 py-4 text-center">{row.durationDays} day{row.durationDays !== 1 ? 's' : ''}</td>
                                                <td className="px-6 py-4 text-center"><OnTimeStatusBadge status={row.onTimeStatus} /></td>
                                                <td className="px-6 py-4 text-center font-mono text-red-400">{row.totalFails > 0 ? row.totalFails : '-'}</td>
                                                <td className="px-6 py-4 text-center font-mono">{row.scrappedCount > 0 ? row.scrappedCount : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ) : (
                                    <tbody>
                                        <tr><td colSpan={9} className="text-center py-12 text-gray-500">No completed jobs found for the selected date range.</td></tr>
                                    </tbody>
                                )}
                            </table>
                        </div>
                    </>
                )}
                {activeTab === 'performance' && (
                     <>
                        <h2 className="text-xl font-bold mb-4">Technician Performance Report</h2>
                        <div className="flex items-center justify-between space-x-4 mb-6 bg-gray-700/50 p-4 rounded-lg">
                             <div className="flex items-center space-x-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition"/>
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition"/>
                                </div>
                                <FilterDropdown
                                    label="Stage Name"
                                    value={techStageFilter}
                                    onChange={e => setTechStageFilter(e.target.value)}
                                    options={stageOptions}
                                />
                            </div>
                            <button onClick={handleExportTechnicians} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Export to Excel
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            <table className="min-w-full text-left text-sm text-gray-300">
                                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Technician / Stage</th>
                                        <th scope="col" className="px-6 py-3 text-center">Items Processed</th>
                                        <th scope="col" className="px-6 py-3 text-center">Passed</th>
                                        <th scope="col" className="px-6 py-3 text-center">Failed</th>
                                        <th scope="col" className="px-6 py-3 text-center">Quality Rate</th>
                                        <th scope="col" className="px-6 py-3 text-center">Avg. Time (min)</th>
                                        <th scope="col" className="px-6 py-3 text-center">Performance</th>
                                    </tr>
                                </thead>
                                {technicianPerformanceByStage.length > 0 ? (
                                    <tbody className="divide-y divide-gray-600">
                                        {technicianPerformanceByStage.flatMap(stageData => [
                                            <tr key={`stage-header-${stageData.stageId}`} className="bg-gray-700/30">
                                                <td colSpan={7} className="px-6 py-3 font-bold text-cyan-400">{stageData.stageName}</td>
                                            </tr>,
                                            ...stageData.technicians.map(row => (
                                                <tr key={`${stageData.stageId}-${row.technicianId}`} className="hover:bg-gray-700/50 transition-colors duration-200">
                                                    <td className="px-6 py-4 font-medium text-white pl-10">{row.technicianName}</td>
                                                    <td className="px-6 py-4 text-center font-mono">{row.totalItemsProcessed}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-green-400">{row.passCount}</td>
                                                    <td className="px-6 py-4 text-center font-mono text-red-400">{row.failCount > 0 ? row.failCount : '-'}</td>
                                                    <td className="px-6 py-4 text-center"><QualityRateBadge rate={row.qualityRate} /></td>
                                                    <td className="px-6 py-4 text-center font-mono">{row.avgTimeMinutes > 0 ? row.avgTimeMinutes.toFixed(2) : '-'}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <PerformanceIndicatorBadge value={row.performanceVsAverage} avgTime={row.avgTimeMinutes} />
                                                    </td>
                                                </tr>
                                            ))
                                        ])}
                                    </tbody>
                                ) : (
                                    <tbody>
                                        <tr><td colSpan={7} className="text-center py-12 text-gray-500">No technician activity found for the selected date range.</td></tr>
                                    </tbody>
                                )}
                            </table>
                        </div>
                    </>
                )}
                {activeTab === 'failure' && (
                    <>
                        <h2 className="text-xl font-bold mb-4">Failure Analysis Report</h2>
                        <div className="flex items-center justify-between space-x-4 mb-6 bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition"/>
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 transition"/>
                                </div>
                                <FilterDropdown
                                    label="Stage Name"
                                    value={failureStageFilter}
                                    onChange={e => setFailureStageFilter(e.target.value)}
                                    options={stageOptions}
                                />
                                <FilterDropdown
                                    label="Product Type"
                                    value={failureProductTypeFilter}
                                    onChange={e => setFailureProductTypeFilter(e.target.value)}
                                    options={productTypeOptions}
                                />
                            </div>
                            <button onClick={handleExportFailures} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Export to Excel
                            </button>
                        </div>
                        <div className="mb-6">
                            {failureReportData.reasonSummary.length > 0 && <ChartRenderer chartData={failureReportData.reasonChartData} />}
                        </div>
                        <div className="flex space-x-6 mb-6">
                            <SummaryCard title="Failures by Reason" data={failureReportData.reasonSummary} total={failureReportData.totalFailures} />
                            <SummaryCard title="Failures by Stage" data={failureReportData.stageSummary} total={failureReportData.totalFailures} />
                            <SummaryCard title="Failures by Product Type" data={failureReportData.productTypeSummary} total={failureReportData.totalFailures} />
                        </div>
                        <h3 className="text-lg font-bold mb-4">Detailed Failure Log ({failureReportData.detailedLog.length})</h3>
                        <div className="overflow-y-auto flex-grow">
                            <table className="min-w-full text-left text-sm text-gray-300">
                                <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                        <th scope="col" className="px-6 py-3">Serial Number</th>
                                        <th scope="col" className="px-6 py-3">Stage</th>
                                        <th scope="col" className="px-6 py-3">Technician</th>
                                        <th scope="col" className="px-6 py-3">Notes</th>
                                    </tr>
                                </thead>
                                {failureReportData.detailedLog.length > 0 ? (
                                    <tbody className="divide-y divide-gray-700">
                                        {failureReportData.detailedLog.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                                                <td className="px-6 py-4 font-mono">
                                                    <div>{row.serialNumber}</div>
                                                    <div className="text-xs text-gray-400">{row.productType} ({row.docketNumber})</div>
                                                </td>
                                                <td className="px-6 py-4">{row.stageName}</td>
                                                <td className="px-6 py-4">{row.technician}</td>
                                                <td className="px-6 py-4"><p className="max-w-xs truncate" title={row.notes}>{(() => {
                                                    try {
                                                        const parsed = JSON.parse(row.notes);
                                                        return (
                                                            <>
                                                                <span className="font-semibold">{parsed.reasons.join(', ')}</span>
                                                                {parsed.details && <span className="text-gray-400 italic"> - {parsed.details}</span>}
                                                            </>
                                                        )
                                                    } catch (e) {
                                                        return row.notes || '-';
                                                    }
                                                })()}</p></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ) : (
                                    <tbody>
                                        <tr><td colSpan={5} className="text-center py-12 text-gray-500">No failures found for the selected date range.</td></tr>
                                    </tbody>
                                )}
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};