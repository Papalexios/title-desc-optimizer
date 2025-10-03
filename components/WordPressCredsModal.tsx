import React, { useState } from 'react';
import { WordPressCreds } from '../types';

interface WordPressCredsModalProps {
    onSave: (creds: WordPressCreds) => void;
    onClose: () => void;
    initialUrl?: string;
}

export const WordPressCredsModal: React.FC<WordPressCredsModalProps> = ({ onSave, onClose, initialUrl }) => {
    
    const getInitialSiteUrl = (fullUrl?: string) => {
        if (!fullUrl) return '';
        try {
            const url = new URL(fullUrl);
            return `${url.protocol}//${url.hostname}`;
        } catch {
            return '';
        }
    };

    const [siteUrl, setSiteUrl] = useState(getInitialSiteUrl(initialUrl));
    const [username, setUsername] = useState('');
    const [appPassword, setAppPassword] = useState('');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (siteUrl && username && appPassword) {
            onSave({ siteUrl, username, appPassword });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Connect to WordPress</h2>
                    <p className="text-sm text-slate-400 mt-1">Enter your site details to update content directly.</p>
                </div>

                <form onSubmit={handleSave}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="siteUrl" className="block text-sm font-medium text-slate-300 mb-1">WordPress Site URL</label>
                            <input
                                id="siteUrl"
                                type="url"
                                value={siteUrl}
                                onChange={(e) => setSiteUrl(e.target.value)}
                                placeholder="https://example.com"
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">Admin Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="your_wp_username"
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="appPassword" className="block text-sm font-medium text-slate-300 mb-1">Application Password</label>
                            <input
                                id="appPassword"
                                type="password"
                                value={appPassword}
                                onChange={(e) => setAppPassword(e.target.value)}
                                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                required
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                            />
                             <p className="text-xs text-slate-400 mt-2">
                                Never use your main password. Generate a secure Application Password in your WP Admin under
                                <span className="font-semibold"> Users &gt; Profile</span>.
                                <a href="https://wordpress.org/documentation/article/application-passwords/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">Learn How</a>
                            </p>
                        </div>
                        <div className="p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-lg text-yellow-200 text-xs">
                            <strong>Security Note:</strong> Your credentials are sent directly from your browser to your WordPress site via a CORS proxy for this action and are not stored after you close this page.
                        </div>
                    </div>

                    <div className="p-6 flex justify-end gap-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Save and Continue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};