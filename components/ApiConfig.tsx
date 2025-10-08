import React, { useState } from 'react';
import { AiConfig, AiProvider } from '../types';
import { Spinner } from './common/Spinner';
import { validateApiKey } from '../services/aiService';

interface ApiConfigProps {
    configs: AiConfig[];
    onAddConfig: (config: AiConfig) => void;
    onRemoveConfig: (id: string) => void;
    onUpdateValidation: (id: string, isValid: boolean) => void;
    isDisabled: boolean;
}

const providerOptions: { value: AiProvider; label: string }[] = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'groq', label: 'Groq' },
];

const AddConfigForm: React.FC<{ 
    onAdd: (config: AiConfig) => void;
    onUpdateValidation: (id: string, isValid: boolean) => void;
    isDisabled: boolean;
}> = ({ onAdd, onUpdateValidation, isDisabled }) => {
    const [provider, setProvider] = useState<AiProvider>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');
    
    const showModelInput = provider === 'openrouter' || provider === 'groq' || provider === 'openai';

    const handleValidateAndAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsValidating(true);
        setError('');

        const newConfig: AiConfig = {
            id: `${provider}-${Date.now()}`,
            provider,
            apiKey,
            model: showModelInput ? model : undefined,
            isValid: null
        };
        
        onAdd(newConfig);

        const success = await validateApiKey(newConfig);
        onUpdateValidation(newConfig.id, success);
        
        if (success) {
            // Reset form for next entry
            setApiKey('');
            setModel('');
            setError('');
        } else {
            setError('API Key is invalid or failed to connect. Please check your key.');
        }
        
        setIsValidating(false);
    };

    return (
         <form onSubmit={handleValidateAndAdd} className="mt-4 space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label htmlFor="provider" className="block text-sm font-medium text-slate-400 mb-1">Provider</label>
                    <select
                        id="provider"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as AiProvider)}
                        disabled={isDisabled || isValidating}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
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
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key here"
                        disabled={isDisabled || isValidating}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
                    />
                </div>
            </div>
             {showModelInput && (
                <div>
                     <label htmlFor="model" className="block text-sm font-medium text-slate-400 mb-1">Model Name (Optional)</label>
                     <input
                        id="model"
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={`e.g., gpt-4o (openai), meta-llama/Llama-3-8b-chat-hf (openrouter), llama3-8b-8192 (groq)`}
                        disabled={isDisabled || isValidating}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-white"
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
                    {isValidating ? <><Spinner /> Validating...</> : 'Validate & Add Key'}
                </button>
            </div>
        </form>
    );
};

export const ApiConfig: React.FC<ApiConfigProps> = ({ configs, onAddConfig, onRemoveConfig, onUpdateValidation, isDisabled }) => {
    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg">
             <h2 className="text-xl font-semibold text-slate-200">Configure AI Providers</h2>
             <p className="text-slate-400 mt-1">Add one or more AI API keys. The app will use all valid keys concurrently to speed up analysis.</p>

            <div className="mt-4 space-y-3">
                {configs.map(config => {
                    const providerLabel = providerOptions.find(p => p.value === config.provider)?.label || config.provider;
                    return (
                        <div key={config.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600">
                            <div className="flex items-center gap-4">
                                <div>
                                    {config.isValid === true && <div className="h-2.5 w-2.5 rounded-full bg-green-400" title="Validated"></div>}
                                    {config.isValid === false && <div className="h-2.5 w-2.5 rounded-full bg-red-400" title="Invalid"></div>}
                                    {config.isValid === null && <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" title="Validating..."></div>}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{providerLabel} {config.model ? `(${config.model})` : ''}</p>
                                    <p className="text-sm text-slate-400 font-mono">Key: ...{config.apiKey.slice(-4)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onRemoveConfig(config.id)}
                                disabled={isDisabled}
                                className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-800/50 hover:bg-red-800 rounded-md disabled:opacity-50"
                            >
                                Remove
                            </button>
                        </div>
                    );
                })}
            </div>

            <AddConfigForm onAdd={onAddConfig} onUpdateValidation={onUpdateValidation} isDisabled={isDisabled} />
        </div>
    );
};
