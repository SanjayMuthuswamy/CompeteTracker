import React, { useEffect, useState } from 'react';
import axios from 'axios';

// --- Type Definitions ---
interface CompetitorDetail {
    name: string;
    website: string;
    rss: string;
    description: string;
}

// --------------------------------------------------------------------------------
// --- COMPONENT: AddCompetitorModal (No Change Needed) ---
// --------------------------------------------------------------------------------

interface AddCompetitorModalProps {
    isVisible: boolean;
    onClose: () => void;
    onCompetitorAdded: () => void; // Function to refresh the list
}

const AddCompetitorModal: React.FC<AddCompetitorModalProps> = ({ isVisible, onClose, onCompetitorAdded }) => {
    const [name, setName] = useState('');
    const [rss, setRss] = useState('');
    const [website, setWebsite] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState('');

    if (!isVisible) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus('');

        try {
            const res = await axios.post('http://localhost:5000/api/add-competitor', {
                competitor_name: name,
                rss_link: rss,
                webpage_link: website,
                description: description
            });
            
            setStatus(`Success: ${res.data.message || 'Competitor added!'}`);
            
            // 1. Reset form fields
            setName('');
            setRss('');
            setWebsite('');
            setDescription('');
            
            // 2. Refresh the parent list
            onCompetitorAdded();
            
            // 3. Close the modal after a delay
            setTimeout(() => {
                onClose();
                setStatus('');
            }, 1500);

        } catch (error) {
            console.error('Error adding competitor:', error);
            // Handle HTTP 409 Conflict (e.g., name already exists)
            const errorMsg = axios.isAxiosError(error) && error.response?.data?.message
                ? error.response.data.message
                : 'Error adding competitor. Check console/backend.';
            setStatus(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>+ Add New Competitor</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {status && <p className={`status-message ${status.startsWith('Success') ? 'success' : 'error'}`}>{status}</p>}

                        <div className="form-group">
                            <label htmlFor="name">Competitor Name</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="rss">RSS Link (URL)</label>
                            <input type="url" id="rss" value={rss} onChange={(e) => setRss(e.target.value)} required placeholder="e.g., https://example.com/rss.xml" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="website">Web Page Link (URL)</label>
                            <input type="url" id="website" value={website} onChange={(e) => setWebsite(e.target.value)} required placeholder="e.g., https://example.com" />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="description">Description (Optional)</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? 'Saving...' : 'Save Competitor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --------------------------------------------------------------------------------
// --- Component: CompetitorManagementCard (Updated for Delete) ---
// --------------------------------------------------------------------------------

interface CompetitorManagementCardProps {
    competitor: CompetitorDetail;
    onCompetitorDeleted: () => void; // New prop to refresh the list
}

const CompetitorManagementCard = ({ competitor, onCompetitorDeleted }: CompetitorManagementCardProps) => {
    const [isFetching, setIsFetching] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    
    // Function to trigger the backend pipeline
    const handleProcess = async () => {
        setIsFetching(true);
        setStatusMessage('Processing (checking RSS, scraping, summarizing with Ollama)...');
        try {
            const res = await axios.post('http://localhost:5000/api/fetch-and-summarize', { 
                competitor_name: competitor.name 
            });
            setStatusMessage(res.data.message || 'Processing complete!');
        } catch (e) {
            console.error("Error during processing:", e);
            setStatusMessage('Error during processing. Check backend logs.');
        } finally {
            setIsFetching(false);
            setTimeout(() => setStatusMessage(''), 8000); 
        }
    };
    
    // 🌟 NEW: Function to handle the delete action 🌟
    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${competitor.name}? This will remove all associated articles.`)) {
            return;
        }

        setStatusMessage(`Deleting ${competitor.name}...`);
        setIsFetching(true); 

        try {
            // CALLS THE NEW DELETE ENDPOINT in Flask
            await axios.delete(`http://localhost:5000/api/competitors/${competitor.name}`);

            setStatusMessage(`${competitor.name} deleted successfully!`);
            
            // 🌟 Refresh the competitor list in the parent component 🌟
            setTimeout(onCompetitorDeleted, 500); 

        } catch (e) {
            console.error("Error during deletion:", e);
            setStatusMessage('Error deleting competitor. Check console/backend logs.');
        } finally {
            setIsFetching(false);
            // Status message will persist until the parent component refreshes/unmounts
        }
    }


    return (
        <div className="competitor-card-management">
            <div className="card-header">
                <div className="competitor-icon">{competitor.name[0]}</div> 
                <div className="details">
                    <h4 className="competitor-name">{competitor.name}</h4>
                    <p className="competitor-description">{competitor.description}</p>
                    <span className="tag tag-saas">SaaS</span> 
                </div>
            </div>
            
            <p className="fetch-status-message">{statusMessage || `RSS: ${competitor.rss.substring(0, 30)}...`}</p>

            <div className="card-links">
                <a href={competitor.website} target="_blank" rel="noopener noreferrer">Website</a>
                <button onClick={handleProcess} disabled={isFetching} className="btn-fetch">
                    {isFetching ? 'Fetching...' : 'Fetch New Data'}
                </button>
            </div>
            
            <div className="actions">
                {/* <button className="btn-edit">Edit</button> */}
                {/* 🌟 ATTACH handleDelete TO THE DELETE BUTTON 🌟 */}
                <button onClick={handleDelete} disabled={isFetching} className="btn-delete">
                    Delete
                </button>
            </div>
        </div>
    );
};

// --------------------------------------------------------------------------------
// --- Main Competitors Page Component (Updated to pass Delete handler) ---
// --------------------------------------------------------------------------------

export default function CompetitorsPage() {
    const [competitors, setCompetitors] = useState<CompetitorDetail[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false); 

    // Function to fetch the detailed list of competitors
    const fetchCompetitors = () => {
        axios.get<CompetitorDetail[]>('http://localhost:5000/api/competitors')
            .then(r => setCompetitors(r.data))
            .catch(e => console.error("Error fetching competitors:", e));
    }

    // Initial fetch
    useEffect(() => {
        fetchCompetitors();
    }, []);

    // 🌟 Unified function to re-fetch the list after Add or Delete 🌟
    const handleListUpdate = () => {
        fetchCompetitors(); 
    }

    return (
        <div className="page-competitors">
            <header className="page-header">
                <div>
                    <h1>Competitors</h1>
                    <p>Tracking {competitors.length} competitors.</p>
                </div>
                {/* Updated button to open modal */}
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    + Add Competitor
                </button>
            </header>
            
            <input type="text" placeholder="Search competitors..." className="search-bar" />

            <div className="competitors-grid">
                {competitors.map((c: CompetitorDetail) => (
                    // 🌟 Pass the update handler down to the card 🌟
                    <CompetitorManagementCard 
                        key={c.name} 
                        competitor={c} 
                        onCompetitorDeleted={handleListUpdate}
                    />
                ))}
            </div>

            {/* Render the modal component */}
            <AddCompetitorModal 
                isVisible={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onCompetitorAdded={handleListUpdate}
            />
        </div>
    );
}