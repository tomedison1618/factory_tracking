import { GoogleGenAI, Type } from "@google/genai";
import { Job, Product, StageEvent, ProductionStage, User, ProductStageLink, UserRole, StageEventStatus } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// This defines the structure for messages in the chat history, matching the Gemini API's expected format.
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// Helper function to build a comprehensive historical data context for the AI prompt.
const getHistoricalDataContext = (
    jobs: Job[],
    products: Product[],
    stageEvents: StageEvent[],
    productionStages: ProductionStage[],
    users: User[],
    productStageLinks: ProductStageLink[]
) => {
    // --- Mappers for quick lookups ---
    const productMap = new Map(products.map(p => [p.id, p]));
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const stageMap = new Map(productionStages.map(s => [s.id, s]));
    const linkToProductMap = new Map(productStageLinks.map(l => [l.id, l.productId]));
    const linkToStageMap = new Map(productStageLinks.map(l => [l.id, l.productionStageId]));

    // --- 1. Completed Jobs Summary ---
    const completedJobSummaries = jobs.filter(j => j.status === 'Completed').map(job => {
        const productsForJob = products.filter(p => p.jobId === job.id);
        const productIdsForJob = new Set(productsForJob.map(p => p.id));
        const linksForJob = productStageLinks.filter(l => productIdsForJob.has(l.productId));
        const linkIdsForJob = new Set(linksForJob.map(l => l.id));
        const eventsForJob = stageEvents.filter(e => linkIdsForJob.has(e.productStageLinkId));

        if (eventsForJob.length === 0) return null;

        const startTimestamp = eventsForJob.reduce((earliest, e) => new Date(e.timestamp) < new Date(earliest) ? e.timestamp : earliest, eventsForJob[0].timestamp);
        const endTimestamp = eventsForJob.reduce((latest, e) => new Date(e.timestamp) > new Date(latest) ? e.timestamp : latest, eventsForJob[0].timestamp);
        
        const failedCount = eventsForJob.filter(e => e.status === StageEventStatus.FAILED).length;
        const scrappedCount = productsForJob.filter(p => p.status === 'Scrapped').length;

        return {
            docketNumber: job.docketNumber,
            productType: job.productType.typeName,
            quantity: job.quantity,
            dueDate: job.dueDate,
            startTimestamp,
            endTimestamp,
            failedCount,
            scrappedCount,
        };
    }).filter(Boolean);

    // --- 2. Technician Performance ---
    const technicians = users.filter(u => u.role === UserRole.TECHNICIAN);
    const technicianPerformance = technicians.map(tech => {
        const eventsByTech = stageEvents.filter(e => e.userId === tech.id);
        const performanceByStage: Record<string, { passCount: number, failCount: number, totalDurationSeconds: number, operations: number }> = {};

        eventsByTech.forEach(e => {
            const stageId = linkToStageMap.get(e.productStageLinkId);
            if (!stageId) return;
            const stage = stageMap.get(stageId);
            if (!stage) return;

            if (!performanceByStage[stage.stageName]) {
                performanceByStage[stage.stageName] = { passCount: 0, failCount: 0, totalDurationSeconds: 0, operations: 0 };
            }
            const stagePerf = performanceByStage[stage.stageName];

            if (e.status === StageEventStatus.PASSED) stagePerf.passCount++;
            if (e.status === StageEventStatus.FAILED) stagePerf.failCount++;
            if (e.status === StageEventStatus.STARTED && e.durationSeconds) {
                stagePerf.totalDurationSeconds += e.durationSeconds;
                stagePerf.operations++;
            }
        });
        
        return {
            technicianName: tech.username,
            performanceByStage: Object.entries(performanceByStage).map(([stageName, stats]) => ({
                stageName,
                ...stats,
                avgTimeMinutes: stats.operations > 0 ? (stats.totalDurationSeconds / stats.operations / 60) : 0,
            })),
        };
    });

    // --- 3. Failure Analysis ---
    const failedEvents = stageEvents.filter(e => e.status === StageEventStatus.FAILED);
    const failuresByStage = failedEvents.reduce((acc, e) => {
        const stage = stageMap.get(linkToStageMap.get(e.productStageLinkId)!)?.stageName || 'Unknown Stage';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const failuresByProductType = failedEvents.reduce((acc, e) => {
        const productId = linkToProductMap.get(e.productStageLinkId);
        const product = productId ? productMap.get(productId) : undefined;
        const job = product ? jobMap.get(product.jobId) : undefined;
        const productType = job?.productType.typeName || 'Unknown Product';
        acc[productType] = (acc[productType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        reportGeneratedAt: new Date().toISOString(),
        completedJobSummaries,
        technicianPerformance,
        failureAnalysis: {
            failuresByStage,
            failuresByProductType,
        },
    };
};

const chartSchema = {
    type: Type.OBJECT,
    properties: {
        textResponse: {
            type: Type.STRING,
            description: "A text-based answer for the user's query.",
            nullable: true,
        },
        chartResponse: {
            type: Type.OBJECT,
            description: "A chart-based visualization for the user's query.",
            nullable: true,
            properties: {
                type: {
                    type: Type.STRING,
                    enum: ['bar', 'pie'],
                    description: "The type of chart to display."
                },
                title: {
                    type: Type.STRING,
                    description: "The title of the chart."
                },
                data: {
                    type: Type.OBJECT,
                    properties: {
                        labels: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "The labels for the chart's axes or segments."
                        },
                        datasets: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING, description: "The label for this dataset." },
                                    data: {
                                        type: Type.ARRAY,
                                        items: { type: Type.NUMBER },
                                        description: "The numerical data for this dataset."
                                    }
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};

export const getAiChatResponseGrounded = async (
    history: ChatMessage[],
    newMessage: string,
    jobs: Job[],
    products: Product[],
    stageEvents: StageEvent[],
    productionStages: ProductionStage[],
    users: User[],
    productStageLinks: ProductStageLink[]
): Promise<string> => {
    const contextData = getHistoricalDataContext(jobs, products, stageEvents, productionStages, users, productStageLinks);

    const systemInstruction = `You are an expert production data analyst AI for a factory.
Your ONLY source of information is the JSON data provided in the user's message CONTEXT.
You must choose the best format for your response: a text-based answer OR a chart visualization.

**Decision Criteria:**
1.  **Use a chart (\`chartResponse\`)** if the user's query involves comparisons, trends, proportions, or rankings (e.g., "compare technicians", "failure rates by product", "which stage is slowest?").
    - Use 'bar' for comparisons of distinct items.
    - Use 'pie' for part-to-whole relationships (proportions).
2.  **Use a text answer (\`textResponse\`)** for all other queries, such as specific data lookups, definitions, or conversational replies.

**Response Rules:**
- You MUST respond with a valid JSON object matching the provided schema.
- You MUST use EITHER 'textResponse' OR 'chartResponse', not both. One must be null.
- Base your analysis and calculations *exclusively* on the provided JSON context. Do not make up data.
- If the data is insufficient to answer, state that in a 'textResponse'.
- Your tone should be helpful, analytical, and professional.
- For text responses, use Markdown for clarity.`;

    const userMessageWithContext = `CONTEXT:\n${JSON.stringify(contextData, null, 2)}\n\nQUESTION:\n${newMessage}`;

    const contents = [
        ...history,
        {
            role: 'user' as const,
            parts: [{ text: userMessageWithContext }]
        }
    ];

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: chartSchema,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error getting AI chat response:", error);
        if (error instanceof Error) {
            // FIX: The error "Cannot find name 'textResponse'" suggests a syntax error where the key was treated as a variable.
            // Corrected to ensure a valid object with a key-value pair is stringified for the error response.
             return JSON.stringify({ textResponse: `Error: Could not get a response from the AI assistant. ${error.message}` });
        }
        // FIX: The error "Cannot find name 'textResponse'" suggests a syntax error where the key was treated as a variable.
        // Corrected to ensure a valid object with a key-value pair is stringified for the error response.
        return JSON.stringify({ textResponse: "Error: Could not get a response from the AI assistant. Please check the console." });
    }
};
