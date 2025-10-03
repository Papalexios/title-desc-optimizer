import React, { useState } from 'react';
import { AiConfig, AiProvider } from '../types';
import { Spinner } from './common/Spinner';

interface ApiConfigProps {
    onConfigSave: (config: AiConfig) => Promise<boolean>;
    isDisabled: boolean;
}

const providerOptions: { value: AiProvider; label: string }[] = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'groq', label: 'Groq' },
];

export const ApiConfig: React.FC<ApiConfigProps> = ({ onConfigSave, isDisabled }) => {
    const [provider, setProvider] = useState<AiProvider>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    
    const [isValidating, setIsValidating] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [error, setError] = useState('');

    const showModelInput = provider === 'openrouter' || provider === 'groq';

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsValidating(true);
        setIsValid(null);
        setError('');
        
        const success = await onConfigSave({ provider, apiKey, model: showModelInput ? model : undefined });
        
        if (success) {
            setIsValid(true);
        } else {
            setIsValid(false);
            setError('API Key is invalid or failed to connect. Please check your key and try again.');
        }
        
        setIsValidating(false);
    };
    
    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex justify-between items-start">
                <div>
                     <h2 className="text-xl font-semibold text-slate-200">Configure AI Provider</h2>
                     <p className="text-slate-400 mt-1">Select your preferred AI provider and enter your API key to begin.</p>
                </div>
                {isValid === true && <div className="text-sm px-3 py-1 bg-green-500/20 text-green-300 rounded-full font-semibold">Validated</div>}
                {isValid === false && <div className="text-sm px-3 py-1 bg-red-500/20 text-red-300 rounded-full font-semibold">Invalid Key</div>}
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="provider" className="block text-sm font-medium text-slate-400 mb-1">Provider</label>
                        <select
                            id="provider"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value as AiProvider)}
                            disabled={isDisabled || isValidating}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                        >
                           {providerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="apiKey" className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
                         <input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => { setApiKey(e.target.value); setIsValid(null); }}
                            placeholder="Enter your API key here"
                            disabled={isDisabled || isValidating}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                        />
                    </div>
                </div>

                {showModelInput && (
                    <div>
                         <label htmlFor="model" className="block text-sm font-medium text-slate-400 mb-1">Model Name</label>
                         <input
                            id="model"
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={`e.g., meta-llama/Llama-3-8b-chat-hf (${provider})`}
                            disabled={isDisabled || isValidating}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                        />
                    </div>
                )}
                
                {error && <p className="text-red-400 text-sm">{error}</p>}
                
                <div className="flex justify-end">
                     <button
                        type="submit"
                        disabled={isDisabled || isValidating || !apiKey}
                        className="flex items-center justify-center px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {isValidating ? <><Spinner /> Validating...</> : 'Save & Validate Key'}
                    </button>
                </div>
            </form>
        </div>
    );
};