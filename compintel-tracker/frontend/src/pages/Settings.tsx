// frontend/src/pages/Settings.tsx

import React, { useState } from 'react';
import axios from 'axios';

// Define your API base URL (ensure this matches your Flask server)
const API_BASE_URL = 'http://localhost:5000/api'; 

// Data for dropdown options
const FREQUENCY_OPTIONS = ['Hourly','Daily', 'Weekly', 'Bi-Weekly', 'Monthly'];
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


// Reusable component for a settings section card
const SettingsSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="settings-section-card settings-section"> 
        <h2>{title}</h2>
        <div className="section-content">
            {children}
        </div>
    </div>
);

export default function SettingsPage() {
    // State to manage the status of the manual send button
    const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    
    // 🌟 NEW STATE FOR DROPDOWNS 🌟
    const [frequency, setFrequency] = useState('Weekly');
    const [dayOfWeek, setDayOfWeek] = useState('Monday');

    const handleSendNow = async () => {
        setSendStatus('sending');
        setStatusMessage('Preparing and sending digest...');

        try {
            // Call the new backend endpoint
            const response = await axios.post(`${API_BASE_URL}/send-digest-now`);
            
            setSendStatus('success');
            setStatusMessage(`Success! ${response.data.message}`); 

        } catch (error) {
            console.error("Error sending digest:", error);
            setSendStatus('error');
            
            const errorMessage = axios.isAxiosError(error) && error.response 
                ? error.response.data.error || 'Server error occurred.' 
                : 'Failed to send digest. Check console for details or verify backend mail setup.';
            setStatusMessage(errorMessage);
            
        } finally {
            setTimeout(() => {
                setSendStatus('idle');
                setStatusMessage('');
            }, 7000);
        }
    };
    
    // 🌟 FUTURE TO-DO: Implement a function to save the schedule to the backend 🌟
    const handleSaveSchedule = () => {
        console.log(`Saving new schedule: ${frequency} on ${dayOfWeek}`);
        // In a real app, this would be an axios.put or axios.post call
        // to a '/api/update-schedule' endpoint with { frequency, dayOfWeek }
    }


    return (
        <div className="page-settings">
            <h1>Settings</h1>
            <p>Manage your account and notification preferences</p>

            {/* Account Settings Section */}
            <SettingsSection title="Account">
                <div className="setting-item account-info">
                    <span className="setting-label label">Email</span> 
                    <p className="setting-value value">nandhu6256@gmail.com</p>
                </div>
                <button className="btn-signout btn-sign-out">⬅ Sign Out</button> 
            </SettingsSection>

            {/* Digest Schedule Section */}
            <SettingsSection title="Digest Schedule">
                
                {/* 1. Display Current Status/Message */}
                {sendStatus !== 'idle' && (
                    <p className={`send-status-message status-${sendStatus}`}>
                        {statusMessage}
                    </p>
                )}

                {/* 2. Digest Notifications Status */}
                <div className="setting-item notification-status">
                    <span className="setting-label label">Digest Notifications</span>
                    <span className="status-enabled notification-status-badge notification-status-enabled">Enabled</span> 
                </div>
                
                {/* 3. Send Now Button */}
                <div className="setting-item send-now-row">
                    <span className="setting-label label">Send Weekly Digest Now</span>
                    <button 
                        className="btn-send-now" 
                        onClick={handleSendNow}
                        disabled={sendStatus === 'sending'}
                    >
                        {sendStatus === 'sending' ? 'Sending...' : 'Send Now'}
                    </button>
                </div>
                
                {/* 4. Frequency Dropdown (Now functional) */}
                <div className="setting-item digest-schedule-form">
                    <span className="setting-label label">Frequency</span>
                    <select 
                        value={frequency} 
                        onChange={(e) => {
                            setFrequency(e.target.value);
                            handleSaveSchedule(); // Call save function on change
                        }} 
                        className="schedule-select"
                    > 
                        {FREQUENCY_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
                
                {/* 5. Day of Week Dropdown (Now functional) */}
                <div className="setting-item digest-schedule-form">
                    <span className="setting-label label">Day of Week</span>
                    <select 
                        value={dayOfWeek} 
                        onChange={(e) => {
                            setDayOfWeek(e.target.value);
                            handleSaveSchedule(); // Call save function on change
                        }} 
                        className="schedule-select"
                    > 
                        {DAY_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
                
            </SettingsSection>

        </div>
    );
}