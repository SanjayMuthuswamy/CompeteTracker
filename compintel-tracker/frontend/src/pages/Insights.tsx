// frontend/src/pages/Insights.tsx

import React, { useState, useEffect, useMemo } from 'react'; // 🌟 ADDED useMemo 🌟
import axios from 'axios';

// --- Type Definitions ---
interface InsightData {
    id: number;
    competitor: string; // Changed to required string based on backend logic
    title: string;
    summary: string;
    category: string;
    priority: 'High Priority' | 'Medium Priority'; // Strict priority types
    status: string;
    action_notes: string | null;
    tags?: string[]; // Used for extracting filter options
}

// 🌟 NEW INTERFACE: To match the backend's structured response 🌟
interface InsightsResponse {
    insights: InsightData[];
    kpis: {
        pending_actions: number;
        high_priority: number;
        total_insights: number;
    }
}

// --- Component: InsightCard (Includes Status Update Logic) ---
const InsightCard = ({ data, onStatusChange }: { data: InsightData, onStatusChange: (id: number, status: string) => void }) => {
    const [isActioning, setIsActioning] = useState(false);

    const handleAction = async (newStatus: string) => {
        setIsActioning(true);
        try {
            await axios.put(`http://localhost:5000/api/insights/${data.id}/status`, { status: newStatus });
            onStatusChange(data.id, newStatus); 
        } catch (e) {
            console.error("Error updating insight status:", e);
        } finally {
            setIsActioning(false);
        }
    };

    // Determine the icon and priority class from the data
    const icon = data.category === 'Trend' ? '📊' : data.category === 'Threat' ? '⚠️' : data.category === 'Recommendation' ? '💡' : '📌';
    const priorityClass = data.priority.toLowerCase().replace(' ', '-');
    const isActioned = data.status !== 'pending'; // Treat anything not pending as actioned/resolved

    return (
        <div className={`insight-card card-priority-${priorityClass}`}>
            <div className="card-header">
                <span className={`insight-icon icon-${data.category.toLowerCase()}`}>{icon}</span>
                <span className={`tag priority-tag tag-${data.category.toLowerCase()}`}>{data.category}</span>
                <span className={`tag priority-tag tag-${priorityClass}`}>{data.priority}</span>
                {data.competitor && <span className="competitor-tag"> • {data.competitor}</span>}
            </div>

            <h4 className="title">{data.title}</h4>
            <p className="summary">{data.summary}</p>
            
            <div className="actions">
                {/* Conditionally render buttons based on status */}
                {isActioned ? (
                    // Button to revert status (e.g., from 'actioned' to 'pending')
                    <button 
                        className="btn-notes" 
                        onClick={() => handleAction('pending')}
                        disabled={isActioning}
                    >
                        {isActioning ? 'Reverting...' : 'Mark as Pending'}
                    </button>
                ) : (
                    // Only show "Mark as Actioned" for pending status
                    <>
                        <button 
                            className="btn-actioned" 
                            onClick={() => handleAction('actioned')} 
                            disabled={isActioning}
                        >
                            {isActioning ? 'Updating...' : 'Mark as Actioned'}
                        </button>
                        <button className="btn-notes">Add Notes</button>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Main Insights Page Component ---
export default function InsightsPage() {
    const [insights, setInsights] = useState<InsightData[]>([]);
    const [loading, setLoading] = useState(true);

    // 🌟 KPI STATES 🌟
    const [kpis, setKpis] = useState({ pending_actions: 0, high_priority: 0, total_insights: 0 });

    // 🌟 FILTER STATES 🌟
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedPriority, setSelectedPriority] = useState('All Priorities');
    const [selectedCompetitor, setSelectedCompetitor] = useState('All Competitors');

    // 🌟 FILTER OPTIONS STATES 🌟
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availablePriorities, setAvailablePriorities] = useState<string[]>([]);
    const [availableCompetitors, setAvailableCompetitors] = useState<string[]>([]);


    const fetchInsights = async () => {
        setLoading(true);
        try {
            // 🌟 Updated to match the backend response structure 🌟
            const res = await axios.get<InsightsResponse>('http://localhost:5000/api/insights');
            const fetchedInsights = res.data.insights;
            
            setInsights(fetchedInsights);
            setKpis(res.data.kpis); // Set the KPIS

            // 🌟 EXTRACT FILTER OPTIONS 🌟
            const categories = new Set(fetchedInsights.map(i => i.category));
            const priorities = new Set(fetchedInsights.map(i => i.priority));
            const competitors = new Set(fetchedInsights.map(i => i.competitor));

            setAvailableCategories(Array.from(categories).sort());
            setAvailablePriorities(Array.from(priorities).sort((a, b) => {
                // Custom sort: High > Medium
                const order = { 'High Priority': 1, 'Medium Priority': 0 };
                return (order[b] || 0) - (order[a] || 0);
            }));
            setAvailableCompetitors(Array.from(competitors).sort());


        } catch (error) {
            console.error("Error fetching insights:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const handleInsightStatusChange = (id: number, newStatus: string) => {
        // Simple update: re-fetch all data to ensure KPIs are accurate
        fetchInsights(); 
    };

    // 🌟 FILTERING LOGIC using useMemo 🌟
    const filteredInsights = useMemo(() => {
        return insights.filter(item => {
            const categoryMatch = selectedCategory === 'All Categories' || item.category === selectedCategory;
            const priorityMatch = selectedPriority === 'All Priorities' || item.priority === selectedPriority;
            const competitorMatch = selectedCompetitor === 'All Competitors' || item.competitor === selectedCompetitor;

            return categoryMatch && priorityMatch && competitorMatch;
        });
    }, [insights, selectedCategory, selectedPriority, selectedCompetitor]);
    

    if (loading) {
        return <div className="loading-spinner">Loading Insights...</div>;
    }

    return (
        <div className="page-insights">
            <header className="page-header">
                <div>
                    <h1>Insights</h1>
                    {/* 🌟 Use KPI data from state 🌟 */}
                    <p>{kpis.pending_actions} pending actions • {kpis.high_priority} high priority</p>
                </div>
                {/* 🌟 Use KPI data from state 🌟 */}
                <button className="btn-secondary">{kpis.total_insights} Total Insights</button>
            </header>

            {/* Filters Section (NOW FUNCTIONAL) */}
            <div className="filters-section">
                <h3 className="filters-title">∇ Filters</h3>
                <div className="filter-dropdowns">
                    {/* Filter 1: Categories */}
                    <select 
                        className="filter-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option>All Categories</option>
                        {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Filter 2: Priorities */}
                    <select 
                        className="filter-select"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                    >
                        <option>All Priorities</option>
                        {availablePriorities.map(prio => (
                            <option key={prio} value={prio}>{prio}</option>
                        ))}
                    </select>

                    {/* Filter 3: Competitors */}
                    <select 
                        className="filter-select"
                        value={selectedCompetitor}
                        onChange={(e) => setSelectedCompetitor(e.target.value)}
                    >
                        <option>All Competitors</option>
                        {availableCompetitors.map(comp => (
                            <option key={comp} value={comp}>{comp}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            {/* Insights Feed (Uses filteredInsights) */}
            <div className="insights-feed">
                {filteredInsights.length > 0 ? (
                    filteredInsights.map((item) => (
                        <InsightCard key={item.id} data={item} onStatusChange={handleInsightStatusChange} />
                    ))
                ) : (
                    <p className="no-data">No insights matching the current filters.</p>
                )}
            </div>
        </div>
    );
}