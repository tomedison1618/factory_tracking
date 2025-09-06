import React from 'react';

interface ChartDataset {
    label: string;
    data: number[];
}

export interface ChartData {
    type: 'bar' | 'pie';
    title: string;
    data: {
        labels: string[];
        datasets: ChartDataset[];
    };
}

const COLORS = ['#22d3ee', '#fde047', '#f87171', '#4ade80', '#c084fc', '#fb923c'];

const BarChart: React.FC<{ chartData: ChartData }> = ({ chartData }) => {
    const { labels, datasets } = chartData.data;
    const data = datasets[0].data; // Assuming single dataset for simplicity

    const maxValue = Math.max(...data, 1);
    const width = 500;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const barWidth = chartWidth / data.length * 0.7;
    const barSpacing = chartWidth / data.length * 0.3;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="figure" aria-label={chartData.title}>
            <g transform={`translate(${padding.left}, ${padding.top})`}>
                {/* Y-axis */}
                <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#4b5563" />
                {[...Array(5)].map((_, i) => {
                    const y = chartHeight - (i / 4) * chartHeight;
                    const value = (i / 4) * maxValue;
                    return (
                        <g key={i}>
                            <line x1="-5" y1={y} x2={chartWidth} y2={y} stroke="#374151" strokeDasharray="2" />
                            <text x="-10" y={y + 5} fill="#9ca3af" textAnchor="end" fontSize="12">{value.toFixed(0)}</text>
                        </g>
                    );
                })}

                {/* Bars */}
                {data.map((value, index) => {
                    const barHeight = (value / maxValue) * chartHeight;
                    const x = index * (barWidth + barSpacing);
                    const y = chartHeight - barHeight;

                    return (
                        <g key={index} className="group">
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={COLORS[index % COLORS.length]}
                                className="transition-opacity duration-200 group-hover:opacity-80"
                            />
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight + 15}
                                textAnchor="middle"
                                fill="#d1d5db"
                                fontSize="12"
                                className="font-semibold"
                            >
                                {labels[index]}
                            </text>
                             <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <rect x={x - 5} y={y - 25} width={barWidth + 10} height="20" fill="#1f2937" rx="4" />
                                <text x={x + barWidth / 2} y={y - 12} textAnchor="middle" fill="#f9fafb" fontSize="12">{value}</text>
                            </g>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
};


const PieChart: React.FC<{ chartData: ChartData }> = ({ chartData }) => {
    const { labels, datasets } = chartData.data;
    const data = datasets[0].data; // Assuming single dataset

    const total = data.reduce((acc, val) => acc + val, 0);
    const radius = 100;
    const cx = 150;
    const cy = 150;
    let startAngle = -90;

    const getCoordinatesForPercent = (percent: number) => {
        const x = cx + radius * Math.cos(2 * Math.PI * percent);
        const y = cy + radius * Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="flex flex-col md:flex-row items-center gap-6">
            <svg viewBox="0 0 300 300" className="w-64 h-64 flex-shrink-0" role="figure" aria-label={chartData.title}>
                {data.map((value, index) => {
                    const percentage = value / total;
                    const [startX, startY] = getCoordinatesForPercent(startAngle / 360);
                    startAngle += percentage * 360;
                    const [endX, endY] = getCoordinatesForPercent(startAngle / 360);

                    const largeArcFlag = percentage > 0.5 ? 1 : 0;

                    const pathData = [
                        `M ${cx} ${cy}`,
                        `L ${startX} ${startY}`,
                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        'Z'
                    ].join(' ');
                    
                    const tooltipText = `${labels[index]}: ${value} (${(percentage * 100).toFixed(1)}%)`;

                    return (
                        <g key={index} className="group">
                             <path d={pathData} fill={COLORS[index % COLORS.length]} className="transition-transform duration-200 group-hover:scale-105 origin-center" />
                             <title>{tooltipText}</title>
                        </g>
                    );
                })}
            </svg>
            <div className="flex-grow">
                 <ul className="space-y-2">
                    {labels.map((label, index) => (
                        <li key={index} className="flex items-center text-sm">
                            <span className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="text-gray-300">{label}</span>
                            <span className="ml-auto font-mono text-gray-400">{data[index]}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


export const ChartRenderer: React.FC<{ chartData: ChartData }> = ({ chartData }) => {
    const renderChart = () => {
        switch (chartData.type) {
            case 'bar':
                return <BarChart chartData={chartData} />;
            case 'pie':
                return <PieChart chartData={chartData} />;
            default:
                return <div className="text-red-400">Unsupported chart type: {chartData.type}</div>;
        }
    };

    return (
        <div className="p-4 bg-gray-800 rounded-lg animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-4 text-center">{chartData.title}</h3>
            {renderChart()}
        </div>
    );
};
