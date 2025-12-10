class CacheService {
  private dbName = 'seo-optimizer-cache';
  private storeName = 'analyses';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = new Promise<void>((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }
      
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('expires', 'expires');
        }
      };
    });
    return this.initPromise;
  }
  
  async set(url: string, data: any, ttl: number = 7 * 24 * 60 * 60 * 1000): Promise<void> { // 7 days default
    await this.init();
    
    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({
            url,
            data,
            expires: Date.now() + ttl
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
  }
  
  async get(url: string): Promise<any | null> {
    await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);
      
      request.onsuccess = () => {
        const record = request.result;
        if (!record || record.expires < Date.now()) {
          if (record) {
              this.clear(url).catch(console.error);
          }
          resolve(null);
        } else {
          resolve(record.data);
        }
      };
      
      request.onerror = () => resolve(null);
    });
  }

  async getMany(urls: string[]): Promise<Map<string, any>> {
    await this.init();
    const results = new Map<string, any>();
    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve) => {
        const promises = urls.map(url => new Promise<void>(res => {
            const request = store.get(url);
            request.onsuccess = () => {
                const record = request.result;
                if (record && record.expires >= Date.now()) {
                    results.set(url, record.data);
                }
                res();
            };
            request.onerror = () => res();
        }));

        Promise.all(promises).then(() => resolve(results));
    });
  }

  async clear(url: string): Promise<void> {
      await this.init();
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.delete(url);
  }

  async clearMany(urls: string[]): Promise<void> {
    await this.init();
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    urls.forEach(url => store.delete(url));
  }
}

export const cacheService = new CacheService();