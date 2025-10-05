// src/components/CompetitorCard.tsx
// This component now represents a single card on the Competitors management page.

import React from 'react';

// Assuming you have a more complex data structure eventually, 
// but for now, we just use the name prop.
export default function CompetitorManagementCard({ name }: { name: string }) {
    
    // NOTE: Hardcoded example data based on your screenshot design
    const description = name === 'TechFlow' ? 'AI-powered workflow automation platform' : 'Real-time data synchronization service';
    const tag = name === 'TechFlow' ? 'SaaS' : 'DevOps';
    
    return (
        <div className="competitor-card-management">
            <div className="card-header">
                {/* Replace with actual logo/icon logic */}
                <div className="competitor-icon">{name[0]}</div> 
                <div className="details">
                    <h4 className="competitor-name">{name}</h4>
                    <p className="competitor-description">{description}</p>
                    <span className={`tag tag-${tag.toLowerCase()}`}>{tag}</span>
                </div>
                <div className="tracking-status">⦿</div> {/* The little tracking eye/icon */}
            </div>

            <div className="social-links">
                {/* Icons for Website, Twitter, LinkedIn */}
                <span>🌐 Website</span>
                <span>🐦 Twitter</span>
                {name === 'TechFlow' && <span>💼 LinkedIn</span>}
            </div>

            <div className="actions">
                <button className="btn-edit">Edit</button>
                <button className="btn-delete">Delete</button>
            </div>
        </div>
    );
}