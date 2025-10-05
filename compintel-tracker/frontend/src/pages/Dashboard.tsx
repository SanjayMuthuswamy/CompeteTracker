// frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// --- Type Definitions ---
interface KPIData {
    unread_changes: number;
    critical_updates: number;
    last_24_hours: number;
}
interface FeedItemData {
    id: number;
    competitor: string; // <-- This is the key field for the new filter
    time_ago: string; 
    title: string;
    summary: string;
    tags: string[];
    source_url: string;
    status: string;
    severity: 'Critical' | 'Medium' | 'Normal' | 'Error';
}
// 🌟 NEW INTERFACE: For fetching competitor list 🌟
interface CompetitorData {
    name: string;
    website: string;
    rss: string;
    description: string;
}

// --- Component: KPI_Card (No Change) ---
const KPI_Card = ({ title, count, description, colorClass }: { title: string, count: number, description: string, colorClass: string }) => (
    <div className={`kpi-card ${colorClass}`}>
        <div className="kpi-content">
            <span className="icon">📈</span>
            <span className="count">{count}</span>
        </div>
        <h4 className="title">{title}</h4>
        <p className="description">{description}</p>
    </div>
);

// --- Component: ActivityFeedItem (No Change) ---
const ActivityFeedItem = ({ data }: { data: FeedItemData }) => {
    const severityClass = `severity-${data.severity.toLowerCase()}`;
    
    let severityIcon = '🟢'; 
    if (data.severity === 'Critical') severityIcon = '🔴';
    if (data.severity === 'Medium') severityIcon = '🟡';

    return (
        <div className="activity-card">
            <div className="icon-company-date">
                <span className={`severity-badge ${severityClass}`}>{severityIcon} {data.severity}</span>
                <span className="company-name">{data.competitor}</span>
                <span className="time-ago">{data.time_ago}</span>
            </div>
            
            <h4 className="title">{data.title}</h4>
            <p className="summary">{data.summary}</p>
            
            <div className="tags-and-source">
                {data.tags.map((tag, index) => (
                    <span key={index} className={`tag tag-${tag.toLowerCase().replace(' ', '-')}`}>{tag}</span>
                ))}
                <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="view-source">View Source ↗</a>
            </div>
        </div>
    );
};

// --- Main Dashboard Component (UPDATED) ---
export default function DashboardPage() {
    const [kpis, setKpis] = useState<KPIData>({ unread_changes: 0, critical_updates: 0, last_24_hours: 0 });
    const [feed, setFeed] = useState<FeedItemData[]>([]);
    const [loading, setLoading] = useState(true);

    // FILTER STATES
    const [selectedType, setSelectedType] = useState('All Types');
    const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
    const [selectedCompetitor, setSelectedCompetitor] = useState('All Competitors'); // 🌟 NEW STATE 🌟

    // FILTER OPTIONS STATES
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [availableSeverities, setAvailableSeverities] = useState<string[]>([]);
    const [availableCompetitors, setAvailableCompetitors] = useState<string[]>([]); // 🌟 NEW STATE 🌟

    // Fetch live data from backend
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // 1. Fetch KPIs
                const kpiRes = await axios.get<KPIData>('http://localhost:5000/api/dashboard/kpis');
                setKpis(kpiRes.data);

                // 2. Fetch Feed
                const feedRes = await axios.get<FeedItemData[]>('http://localhost:5000/api/dashboard-feed');
                const fetchedFeed = feedRes.data;
                setFeed(fetchedFeed);

                // 🌟 3. Fetch Competitors for the filter 🌟
                const compRes = await axios.get<CompetitorData[]>('http://localhost:5000/api/competitors');
                const compNames = compRes.data.map(c => c.name).sort();
                setAvailableCompetitors(compNames);


                // 4. Extract unique Type and Severity filter options
                const types = new Set<string>();
                const severities = new Set<string>();

                fetchedFeed.forEach(item => {
                    item.tags.forEach(tag => types.add(tag));
                    severities.add(item.severity);
                });

                // Sort and set available options
                setAvailableTypes(Array.from(types).sort());
                setAvailableSeverities(Array.from(severities).sort((a, b) => {
                    // Custom sort: Critical > Medium > Normal > Error
                    const order = { 'Critical': 3, 'Medium': 2, 'Normal': 1, 'Error': 0 };
                    return (order[b] || 0) - (order[a] || 0);
                }));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // FILTERING LOGIC using useMemo 
    const filteredFeed = useMemo(() => {
        return feed.filter(item => {
            // Filter 1: Severity
            const severityMatch = selectedSeverity === 'All Severities' || item.severity === selectedSeverity;
            
            // Filter 2: Type (Tags)
            const typeMatch = selectedType === 'All Types' || item.tags.includes(selectedType);

            // 🌟 Filter 3: Competitor 🌟
            const competitorMatch = selectedCompetitor === 'All Competitors' || item.competitor === selectedCompetitor;

            return severityMatch && typeMatch && competitorMatch;
        });
    }, [feed, selectedSeverity, selectedType, selectedCompetitor]);


    if (loading) {
        return <div className="loading-spinner">Loading Dashboard...</div>;
    }

    return (
        <div className="page-dashboard">
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Monitor competitor activities and changes</p>
            
            {/* KPI Cards Row (No Change) */}
            <div className="kpi-cards-grid">
                <KPI_Card title="Unread Changes" count={kpis.unread_changes} description="Require your attention" colorClass="kpi-blue" />
                <KPI_Card title="Critical Updates" count={kpis.critical_updates} description="High priority items" colorClass="kpi-red" />
                <KPI_Card title="Last 24 Hours" count={kpis.last_24_hours} description="Recent activity" colorClass="kpi-green" />
            </div>

            {/* Filters Section (UPDATED) */}
            <div className="filters-section">
                <h3 className="filters-title">∇ Filters</h3>
                <div className="filter-dropdowns">
                    {/* Filter 1: Type (Tags) */}
                    <select 
                        className="filter-select"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        <option>All Types</option>
                        {availableTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    {/* Filter 2: Severity */}
                    <select 
                        className="filter-select"
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                    >
                        <option>All Severities</option>
                        {availableSeverities.map(severity => (
                            <option key={severity} value={severity}>{severity}</option>
                        ))}
                    </select>

                    {/* 🌟 Filter 3: Competitors 🌟 */}
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

            {/* Activity Feed */}
            <div className="activity-feed">
                {filteredFeed.length > 0 ? (
                    filteredFeed.map((item) => (
                        <ActivityFeedItem key={item.id} data={item} />
                    ))
                ) : (
                    <p className="no-data">No recent activity matching the current filters.</p>
                )}
            </div>
        </div>
    );
}