import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";
import "rxjs/add/operator/map";
import "rxjs/add/operator/concatMap";
import "rxjs/add/observable/of";

import SaveDataModel from "./SaveDataModel";

/**
 * # Provide caching mechanism
 */
class LetsCache {

    /**
     * Create Observable instance
     *
     * assuming to provide a way to create Observable instance to give this
     * "bypass" method without client need to include rsjs libraries.
     */
    static observable<T>(f: (observer: Observer<T>) => void): Observable<T> {
        return Observable.create(f);
    }

    /**
     * Milliseconds to expire cache
     */
    get cacheExpirationTime(): number { return this._cacheExpirationTime; }
    private _cacheExpirationTime: number;

    /**
     * Database name
     */
    get dbname(): string { return this._dbname; }
    private _dbname: string;

    /**
     * Custom function to validate cache
     *
     * @param policy returning true indicates the cache has already expired
     */
    set cacheExpirationPolicy(policy: (data: SaveDataModel) => boolean) {
        this._cacheExpirationPolicy = policy;
    }
    private _cacheExpirationPolicy: (data: SaveDataModel) => boolean;

    /**
     * Internally held IndexedDB connection
     */
    private indexedDb: IDBDatabase;

    /**
     * Object store name IndexedDB uses
     */
    private static storename = "letscache";

    /**
     *
     *
     * @param dbname database name to store data
     */
    constructor(dbname: string, cacheExpirationTime: number = 24 * 60 * 60 * 1000) {
        this._dbname = dbname;
    }

    /**
     * Initialize this instance
     *
     * Db connection won't be aquired without initialization,
     * so that further actions will all fail.
     */
    initialize(): Observable<void> {
        return Observable.create((observer: Observer<void>) => {
            const request = indexedDB.open(this.dbname, 1);

            request.onupgradeneeded = event => {
                const db = (<IDBRequest>event.target).result;
                this.indexedDb = db;
                db.createObjectStore(LetsCache.storename, { keyPath: "key" });
            };
            request.onsuccess = event => {
                this.indexedDb = (<IDBRequest>event.target).result;
                observer.next(undefined);
                observer.complete();
            };
            request.onerror = event => {
                observer.error(event);
            };
        });
    }

    /**
     * @param key key to store/retrieve data
     * @param whenNoCache data retrieving Observable (eg. http request) executed
     * when no cache is available with the key
     */
    bypass<T>(key: string, whenNoCache: Observable<T>): Observable<T>;
    /**
     * @param key key to store/retrieve data
     * @param whenNoCache data retrieving procedure (eg. http request) executed
     * when no cache is available with the key
     */
    bypass<T>(key: string, whenNoCache: (observer: Observer<T>) => void): Observable<T>;
    /**
     * Try to find saved data in IndexedDB with the key before executing a procedure
     * to retrieve data
     *
     * If data not found or found but expired, data retrieving procedure is
     * executed and saved to IndexedDB.
     *
     * ```javascript
     * function getData(observer) {
     *   $.get('/data/data.json', function (data) {
     *     observer.next(data);
     *     observer.complete();
     *   });
     * };
     *
     * var c = new LetsCache("foo");
     * c.initialize().subscribe(function () {
     *   c.bypass("key1", getData).subscribe(function (data) {
     *     console.log(data);
     *   });
     * });
     * ```
     */
    bypass<T>(key: string, whenNoCache: any): Observable<T> {
        if (whenNoCache instanceof Function) {
            whenNoCache = Observable.create(whenNoCache);
        }

        return this.read(key)
            .map(result => result && result.data)
            .concatMap((data: T) => {
                if (data) {
                    return Observable.of(data);
                } else {
                    // absense of cache
                    return whenNoCache.map((data: T) => {
                        this.write(key, data).subscribe();
                        return data;
                    });
                }
            });
    }

    /**
     * Validating cache is still alive
     *
     * @param timestamp
     */
    private isCacheExpired(data: SaveDataModel): boolean {
        if (this._cacheExpirationPolicy) {
            return this._cacheExpirationPolicy(data);
        } else {
            const now = new Date().getTime();
            const diff = now - data.timestamp;
            return diff >= this._cacheExpirationTime;
        }
    }

    /**
     * Read date from IndexedDB
     */
    private read(key: string): Observable<SaveDataModel> {
        return Observable.create((observer: Observer<void>) => {
            const transaction = this.indexedDb.transaction(LetsCache.storename, "readonly");
            const store = transaction.objectStore(LetsCache.storename);
            const request = store.get(key);
            request.onsuccess = event => {
                const result = (<IDBRequest>event.target).result;
                if (!result || this.isCacheExpired(result)) {
                    observer.next(undefined);
                    observer.complete();
                } else {
                    observer.next(result);
                    observer.complete();
                }
            };
            request.onerror = event => observer.error(event);
        });
    }

    /**
     * Write data to IndexedDB
     */
    private write(key: string, data: any): Observable<void> {
        return Observable.create((observer: Observer<void>) => {
            const transaction = this.indexedDb.transaction(LetsCache.storename, "readwrite");
            const store = transaction.objectStore(LetsCache.storename);
            const save: SaveDataModel = { key, data, timestamp: new Date().getTime() };
            const request = store.put(save);
            request.onsuccess = event => {
                observer.next(undefined);
                observer.complete();
            };
            request.onerror = event => observer.error(event);
        });
    }
}

export = LetsCache;
