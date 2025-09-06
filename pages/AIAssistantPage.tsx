import React, { useState, useRef, useEffect } from 'react';
import { Job, Product, StageEvent, ProductionStage, User, ProductStageLink } from '../types';
import { getAiChatResponseGrounded, ChatMessage } from '../services/aiService';
import { ChartRenderer, ChartData } from '../components/ChartRenderer';

interface AIAssistantPageProps {
    jobs: Job[];
    products: Product[];
    stageEvents: StageEvent[];
    productionStages: ProductionStage[];
    users: User[];
    productStageLinks: ProductStageLink[];
}

const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    // A simple renderer; for a real app, a library like 'marked' or 'react-markdown' would be better.
    const content: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            content.push(
                <ul key={`ul-${content.length}`} className="list-disc pl-5 space-y-1">
                    {listItems.map((item, i) => {
                        const parts = item.split(/(\*\*.*?\*\*)/g).map((part, p_i) =>
                            part.startsWith('**') ? <strong key={p_i} className="font-bold text-gray-100">{part.slice(2, -2)}</strong> : part
                        );
                        return <li key={i}>{parts}</li>
                    })}
                </ul>
            );
            listItems = [];
        }
    };

    text.split('\n').forEach((line) => {
        if (line.startsWith('* ')) {
            listItems.push(line.substring(2));
        } else {
            flushList();
            if (line.startsWith('### ')) {
                content.push(<h3 key={`h3-${content.length}`} className="text-lg font-bold text-gray-100 mt-4">{line.substring(4)}</h3>);
            } else if (line.startsWith('## ')) {
                content.push(<h2 key={`h2-${content.length}`} className="text-xl font-bold text-cyan-400 mt-6">{line.substring(3)}</h2>);
            } else if (line.startsWith('# ')) {
                content.push(<h1 key={`h1-${content.length}`} className="text-2xl font-bold text-white mt-6">{line.substring(2)}</h1>);
            } else if (line.trim() !== '') {
                const parts = line.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                    part.startsWith('**') ? <strong key={i} className="font-bold text-gray-100">{part.slice(2, -2)}</strong> : part
                );
                content.push(<p key={`p-${content.length}`}>{parts}</p>);
            }
        }
    });

    flushList();

    return <div className="max-w-none space-y-4 text-gray-300 leading-relaxed">{content}</div>;
};

const ChatBubbleContent: React.FC<{ content: string }> = ({ content }) => {
    try {
        const parsed = JSON.parse(content);
        if (parsed.chartResponse) {
            return <ChartRenderer chartData={parsed.chartResponse as ChartData} />;
        }
        if (parsed.textResponse) {
            return <MarkdownRenderer text={parsed.textResponse} />;
        }
    } catch (e) {
        // Not a valid JSON or doesn't match schema, treat as plain markdown text
        return <MarkdownRenderer text={content} />;
    }
    // Fallback for valid JSON that isn't a chart or text response
    return <MarkdownRenderer text={content} />;
};


export const AIAssistantPage: React.FC<AIAssistantPageProps> = (props) => {
    const { jobs, products, stageEvents, productionStages, users, productStageLinks } = props;
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'model',
            parts: [{ text: JSON.stringify({ textResponse: "Hello! I am your AI Production Analyst. I have access to the complete history of all jobs and events. Ask me complex questions about past performance, such as 'Compare failure rates by product type' or 'Which technicians had the highest pass rates last month?'" }) }]
        }
    ]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isLoading]);
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessageText = inputValue;
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: userMessageText }] };
        
        const currentHistory = [...messages, userMessage];
        setMessages(currentHistory);
        setInputValue('');
        setIsLoading(true);

        try {
            const result = await getAiChatResponseGrounded(
                messages, // Pass history *before* the new user message
                userMessageText,
                jobs, products, stageEvents, productionStages, users, productStageLinks
            );
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: result }] };
            setMessages(prev => [...prev, modelMessage]);
        } catch (err) {
            const errorText = err instanceof Error ? err.message : 'An unknown error occurred.';
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: JSON.stringify({ textResponse: `Sorry, I encountered an error: ${errorText}` }) }] };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8">
            <div className="flex items-center space-x-4 mb-6 flex-shrink-0">
                <div className="bg-cyan-500/10 p-3 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.618 2.065A.5.5 0 0110 2.5v1.259a.5.5 0 01-.152.353L8 6.017V7.5a.5.5 0 01-1 0V6.017L5.152 4.112A.5.5 0 015 3.759V2.5a.5.5 0 01.382-.485l.02-.006a10.82 10.82 0 014.236-.002l.02-.006zM2.848 7.152A.5.5 0 013.259 7h1.259a.5.5 0 01.353.152L6.772 9H7.5a.5.5 0 010 1H6.772l-1.904 1.848A.5.5 0 014.517 12H3.259a.5.5 0 01-.41-.74l.006-.01A10.82 10.82 0 012.848 7.152zM15.152 7.152a.5.5 0 00-.41.74l.006.01a10.82 10.82 0 00.002 4.236l-.006.01a.5.5 0 00.41.74h1.259a.5.5 0 00.353-.152L18 10.096V11.5a.5.5 0 001 0v-1.404l1.848-1.904A.5.5 0 0020 7.848v-1.26a.5.5 0 00-.382-.485l-.02-.006a10.82 10.82 0 00-4.236-.002l-.02-.006A.5.5 0 0015.152 6h-1.404L12 7.848A.5.5 0 0012.152 8.2l1.904 1.904L15.483 10H14.5a.5.5 0 000 1h.983l1.904-1.848A.5.5 0 0017.848 8H16.596L15.152 7.152zM10 12.5a.5.5 0 01.382.485l.02.006a10.82 10.82 0 004.236.002l.02.006A.5.5 0 0115 13.5v1.259a.5.5 0 01-.152.353L13 17.017V18.5a.5.5 0 01-1 0v-1.483l-1.848-1.904A.5.5 0 019.848 15H8.596L7.152 13.152A.5.5 0 017 12.793v-1.26a.5.5 0 01.382-.485l.02-.006a10.82 10.82 0 014.236-.002l.02-.006A.5.5 0 0112.152 11H13.5a.5.5 0 010 1h-.983l-1.904 1.848A.5.5 0 0010.152 14H11.4l1.447 1.447A.5.5 0 0013.207 15H14.5a.5.5 0 010-1h-.983L11.669 12H10v.5z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">AI Production Assistant</h1>
                    <p className="text-gray-400">Your interactive data analyst.</p>
                </div>
            </div>

            <div className="flex-grow bg-gray-800 rounded-xl shadow-lg flex flex-col overflow-hidden">
                <div ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex-shrink-0 flex items-center justify-center">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                </div>
                            )}
                            <div className={`max-w-2xl p-4 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>
                                {msg.role === 'model' ? <ChatBubbleContent content={msg.parts[0].text} /> : <MarkdownRenderer text={msg.parts[0].text} />}
                            </div>
                        </div>
                    ))}
                     {isLoading && (
                        <div className="flex items-start gap-4 justify-start">
                             <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex-shrink-0 flex items-center justify-center">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                             </div>
                            <div className="max-w-xl p-4 rounded-xl bg-gray-700 flex items-center space-x-2">
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-0"></span>
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></span>
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="e.g., Show me failure rates by product type"
                            disabled={isLoading}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 transition disabled:opacity-50"
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold p-3 rounded-lg shadow-md transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            aria-label="Send message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};