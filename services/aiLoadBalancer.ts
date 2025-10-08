import { AiConfig, SeoAnalysis } from '../types';
import { analyzeSeo, AnalysisResult, RateLimitError } from './aiService';

// Type definitions for the balancer's event-driven system
type ProgressCallback = (progress: { completed: number; total: number; activeWorkers: number }) => void;
export type ResultCallback = (result: { url: string; analysis: AnalysisResult }) => void;
type ErrorCallback = (url: string, error: Error) => void;

interface Job {
    data: SeoAnalysis;
    retries: number;
}

const MAX_RETRIES = 2;
const COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * An "ultra-adaptive" AI Load Balancer.
 * This SOTA engine manages a pool of AI configurations (workers) to process analysis jobs in parallel.
 * It intelligently handles rate-limiting by putting affected workers on a timeout and redistributing
 * their work, creating a resilient and self-healing system for maximum throughput.
 */
export class AILoadBalancer {
    private jobQueue: Job[] = [];
    private workers: { config: AiConfig; status: 'ready' | 'busy' | 'coolingDown' }[];
    private totalJobs = 0;
    private completedJobs = 0;

    // Event listeners
    private onProgressCallback: ProgressCallback = () => {};
    private onResultCallback: ResultCallback = () => {};
    private onErrorCallback: ErrorCallback = () => {};

    constructor(configs: AiConfig[]) {
        this.workers = configs.map(config => ({ config, status: 'ready' }));
    }

    // Public methods to subscribe to events
    public onProgress(callback: ProgressCallback) {
        this.onProgressCallback = callback;
    }

    public onResult(callback: ResultCallback) {
        this.onResultCallback = callback;
    }

    public onError(callback: ErrorCallback) {
        this.onErrorCallback = callback;
    }

    /**
     * Adds a list of SEO data objects to the processing queue.
     * @param dataToAnalyze An array of pages to be analyzed.
     */
    public async processQueue(dataToAnalyze: SeoAnalysis[]): Promise<void> {
        this.jobQueue = dataToAnalyze.map(data => ({ data, retries: 0 }));
        this.totalJobs = dataToAnalyze.length;
        this.completedJobs = 0;

        // Start processing the queue.
        // We return a promise that resolves when the queue is empty.
        return new Promise(resolve => {
            const checkCompletion = () => {
                if (this.completedJobs === this.totalJobs) {
                    resolve();
                } else {
                     // Check every 100ms if there are more jobs to process.
                    this.tryProcessNext();
                    setTimeout(checkCompletion, 100);
                }
            };
            this.tryProcessNext(); // Initial kick-off
            checkCompletion();
        });
    }

    private tryProcessNext() {
        if (this.jobQueue.length === 0) {
            return; // All jobs are either done or being processed
        }

        const availableWorker = this.workers.find(w => w.status === 'ready');
        if (!availableWorker) {
            return; // All workers are busy or cooling down
        }

        const job = this.jobQueue.shift();
        if (job) {
            availableWorker.status = 'busy';
            this.processJob(job, availableWorker);
        }
    }
    
    private async processJob(job: Job, worker: { config: AiConfig; status: 'busy' | 'coolingDown' | 'ready' }) {
        try {
            const analysis = await analyzeSeo(job.data.title, job.data.description, worker.config);
            
            this.onResultCallback({ url: job.data.url, analysis });
            this.completedJobs++;
            
            // Job successful, worker is ready for more.
            worker.status = 'ready';

        } catch (error) {
            const err = error as Error;

            if (error instanceof RateLimitError) {
                console.warn(`Worker ${worker.config.id} is rate-limited. Cooling down for ${COOLDOWN_MS / 1000}s.`);
                // Put the worker in cool-down.
                worker.status = 'coolingDown';
                setTimeout(() => {
                    console.log(`Worker ${worker.config.id} is now ready after cool-down.`);
                    worker.status = 'ready';
                }, COOLDOWN_MS);
                
                // Re-queue the job at the front of the line.
                this.jobQueue.unshift(job);

            } else if (job.retries < MAX_RETRIES) {
                // For other transient errors, retry.
                job.retries++;
                console.warn(`Job for ${job.data.url} failed. Retrying (${job.retries}/${MAX_RETRIES}). Error: ${err.message}`);
                this.jobQueue.push(job); // Add to the back of the queue
                worker.status = 'ready';

            } else {
                // Max retries reached, job has failed.
                this.onErrorCallback(job.data.url, err);
                this.completedJobs++;
                worker.status = 'ready';
            }
        }
        
        const activeWorkers = this.workers.filter(w => w.status !== 'coolingDown').length;
        this.onProgressCallback({ completed: this.completedJobs, total: this.totalJobs, activeWorkers });
        
        // After processing, immediately try to pick up the next job.
        this.tryProcessNext();
    }
}