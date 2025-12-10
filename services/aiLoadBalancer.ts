import { AiConfig, SeoAnalysis, SeoData, RewriteSuggestion, SerpResult } from '../types';
import { AnalysisResult, RateLimitError, runFullAnalysisAndSuggestion } from './aiService';

type ProgressCallback = (progress: { completed: number; total: number; activeWorkers: number }) => void;
export type ResultCallback = (result: { url: string; data: { analysis: AnalysisResult; suggestions: RewriteSuggestion[] } }) => void;
type ErrorCallback = (url: string, error: Error) => void;

export interface Job {
    data: SeoAnalysis;
    retries: number;
    serpData: SerpResult[];
    topicCluster: { url: string; title: string; intent?: string }[];
}

const MAX_RETRIES = 2;
const COOLDOWN_MS = 60 * 1000; // 60 seconds

export class AILoadBalancer {
    private jobQueue: Job[] = [];
    private workers: { config: AiConfig; status: 'ready' | 'busy' | 'coolingDown' }[];
    private totalJobs = 0;
    private completedJobs = 0;
    private analysisContext: { allPages: SeoData[], targetLocation?: string } = { allPages: [] };
    
    // Optimization: Index pages by topic for O(1) Graph RAG lookup
    private topicIndex = new Map<string, { url: string; title: string; intent: string }[]>();

    private onProgressCallback: ProgressCallback = () => {};
    private onResultCallback: ResultCallback = () => {};
    private onErrorCallback: ErrorCallback = () => {};

    constructor(configs: AiConfig[]) {
        this.workers = configs.map(config => ({ config, status: 'ready' }));
    }

    public onProgress(callback: ProgressCallback) { this.onProgressCallback = callback; }
    public onResult(callback: ResultCallback) { this.onResultCallback = callback; }
    public onError(callback: ErrorCallback) { this.onErrorCallback = callback; }

    public async processQueue(jobs: Job[], context?: { allPages: SeoData[], targetLocation?: string }): Promise<void> {
        this.jobQueue = jobs;
        this.totalJobs = jobs.length;
        this.completedJobs = 0;
        this.analysisContext = context || { allPages: [] };

        // Pre-compute topic index for speed
        this.topicIndex.clear();
        this.analysisContext.allPages.forEach(p => {
             const analysis = p as SeoAnalysis;
             const topic = analysis.topic || 'Uncategorized';
             if (!this.topicIndex.has(topic)) {
                 this.topicIndex.set(topic, []);
             }
             this.topicIndex.get(topic)!.push({
                 url: p.url,
                 title: p.title,
                 intent: analysis.searchIntent || 'informational'
             });
        });

        return new Promise(resolve => {
            const checkCompletion = () => {
                if (this.completedJobs === this.totalJobs) {
                    resolve();
                } else {
                    this.tryProcessNext();
                    setTimeout(checkCompletion, 100);
                }
            };
            this.tryProcessNext();
            checkCompletion();
        });
    }

    private tryProcessNext() {
        if (this.jobQueue.length === 0) return;
        const availableWorker = this.workers.find(w => w.status === 'ready');
        if (!availableWorker) return;
        const job = this.jobQueue.shift();
        if (job) {
            availableWorker.status = 'busy';
            this.processJob(job, availableWorker);
        }
    }
    
    private async processJob(job: Job, worker: { config: AiConfig; status: 'busy' | 'coolingDown' | 'ready' }) {
        try {
            // SOTA UPGRADE: High-Speed Graph Context Injection
            // Uses the pre-computed index for O(1) access instead of filtering the whole array.
            const topic = job.data.topic || 'Uncategorized';
            const allSiblings = this.topicIndex.get(topic) || [];
            
            // Filter out self and take top 10
            const clusterSiblings = allSiblings
                .filter(p => p.url !== job.data.url)
                .slice(0, 10);

            const fullResult = await runFullAnalysisAndSuggestion(
                job.data,
                worker.config,
                { 
                    allPages: this.analysisContext.allPages, 
                    // Pass the calculated graph context, fallback to job's basic cluster if needed
                    topicCluster: clusterSiblings.length > 0 ? clusterSiblings : job.topicCluster 
                },
                job.serpData,
                this.analysisContext.targetLocation
            );
            
            this.onResultCallback({ url: job.data.url, data: fullResult });
            this.completedJobs++;
            worker.status = 'ready';

        } catch (error) {
            const err = error as Error;
            if (error instanceof RateLimitError) {
                console.warn(`Worker ${worker.config.id} is rate-limited. Cooling down...`);
                worker.status = 'coolingDown';
                setTimeout(() => { worker.status = 'ready'; }, COOLDOWN_MS);
                this.jobQueue.unshift(job);
            } else if (job.retries < MAX_RETRIES) {
                job.retries++;
                console.warn(`Job for ${job.data.url} failed. Retrying (${job.retries}/${MAX_RETRIES}). Error: ${err.message}`);
                this.jobQueue.push(job);
                worker.status = 'ready';
            } else {
                this.onErrorCallback(job.data.url, err);
                this.completedJobs++;
                worker.status = 'ready';
            }
        }
        
        const activeWorkers = this.workers.filter(w => w.status !== 'coolingDown').length;
        this.onProgressCallback({ completed: this.completedJobs, total: this.totalJobs, activeWorkers });
        this.tryProcessNext();
    }
}