import type { ExecutionRecord } from '@/types/workflow'

/**
 * IndexedDB manager for workflow execution history
 * Provides persistent storage for execution records with automatic cleanup
 */
export class WorkflowHistoryDB {
  private dbName = 'workflow_history'
  private version = 1
  private storeName = 'executions'
  private db: IDBDatabase | null = null
  private retentionDays = 30

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id'
          })

          // Create indexes for efficient querying
          objectStore.createIndex('workflowId', 'workflowId', { unique: false })
          objectStore.createIndex('status', 'status', { unique: false })
          objectStore.createIndex('startTime', 'startTime', { unique: false })
          objectStore.createIndex('workflowId_startTime', ['workflowId', 'startTime'], {
            unique: false
          })
        }
      }
    })
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  /**
   * Add execution record to history
   */
  async addExecution(execution: ExecutionRecord): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.add(execution)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to add execution'))
    })
  }

  /**
   * Update existing execution record
   */
  async updateExecution(execution: ExecutionRecord): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(execution)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to update execution'))
    })
  }

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<ExecutionRecord | null> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(new Error('Failed to get execution'))
    })
  }

  /**
   * Get all executions for a workflow
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit?: number
  ): Promise<ExecutionRecord[]> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('workflowId_startTime')
      
      // Query in reverse order (newest first)
      const request = index.openCursor(
        IDBKeyRange.bound([workflowId, 0], [workflowId, Date.now()]),
        'prev'
      )

      const results: ExecutionRecord[] = []
      let count = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result

        if (cursor && (!limit || count < limit)) {
          results.push(cursor.value)
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(new Error('Failed to get workflow executions'))
    })
  }

  /**
   * Get all executions with optional filtering
   */
  async getAllExecutions(filters?: {
    status?: ExecutionRecord['status'][]
    startDate?: number
    endDate?: number
    limit?: number
  }): Promise<ExecutionRecord[]> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('startTime')
      
      const request = index.openCursor(null, 'prev')
      const results: ExecutionRecord[] = []
      let count = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result

        if (cursor && (!filters?.limit || count < filters.limit)) {
          const record = cursor.value as ExecutionRecord

          // Apply filters
          let include = true

          if (filters?.status && !filters.status.includes(record.status)) {
            include = false
          }

          if (filters?.startDate && record.startTime < filters.startDate) {
            include = false
          }

          if (filters?.endDate && record.startTime > filters.endDate) {
            include = false
          }

          if (include) {
            results.push(record)
            count++
          }

          cursor.continue()
        } else {
          resolve(results)
        }
      }

      request.onerror = () => reject(new Error('Failed to get all executions'))
    })
  }

  /**
   * Delete execution by ID
   */
  async deleteExecution(id: string): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to delete execution'))
    })
  }

  /**
   * Clear all execution history
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear executions'))
    })
  }

  /**
   * Cleanup old executions based on retention policy
   */
  async cleanup(): Promise<number> {
    const cutoffTime = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('startTime')
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))
      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result

        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          resolve(deletedCount)
        }
      }

      request.onerror = () => reject(new Error('Failed to cleanup executions'))
    })
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalExecutions: number
    byStatus: Record<string, number>
    oldestExecution?: number
    newestExecution?: number
  }> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const executions = request.result as ExecutionRecord[]
        
        const byStatus: Record<string, number> = {}
        let oldest: number | undefined
        let newest: number | undefined

        executions.forEach((exec) => {
          byStatus[exec.status] = (byStatus[exec.status] || 0) + 1
          
          if (!oldest || exec.startTime < oldest) {
            oldest = exec.startTime
          }
          if (!newest || exec.startTime > newest) {
            newest = exec.startTime
          }
        })

        resolve({
          totalExecutions: executions.length,
          byStatus,
          oldestExecution: oldest,
          newestExecution: newest
        })
      }

      request.onerror = () => reject(new Error('Failed to get stats'))
    })
  }

  /**
   * Set retention period in days
   */
  setRetentionDays(days: number): void {
    this.retentionDays = days
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Singleton instance
export const workflowHistoryDB = new WorkflowHistoryDB()
