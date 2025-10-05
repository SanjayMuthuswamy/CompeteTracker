// src/App.tsx

import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardPage from './pages/Dashboard';
import CompetitorsPage from './pages/Competitors';
import InsightsPage from './pages/Insights';
import SettingsPage from './pages/Settings';

// Import your custom styling here (assuming styles.css handles the dark theme)

// A simple utility to set the active link class
const NavLink = ({ to, children }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
            {children}
        </Link>
    );
};

export default function App() {
    return (
        <div className="app-container">
            {/* --- TOP NAVIGATION BAR --- */}
            <header className="navbar">
                <div className="logo-section">
                    {/* Placeholder for your CompeteTrack Logo */}
                    <div className="logo-icon">◎</div> 
                    <span className="logo-text">CompeteTrack</span>
                </div>
                <nav className="nav-links">
                    <NavLink to="/dashboard">📋 Dashboard</NavLink>
                    <NavLink to="/competitors">👥 Competitors</NavLink>
                    <NavLink to="/insights">💡 Insights</NavLink>
                    <NavLink to="/settings">⚙️ Settings</NavLink>
                </nav>
            </header>
            
            {/* --- PAGE CONTENT AREA (Routing) --- */}
            <main className="content-area">
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/competitors" element={<CompetitorsPage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </main>
        </div>
    );
}

// NOTE: You will need CSS classes for 'app-container', 'navbar', 'nav-link', etc., 
// to match the dark-theme design.