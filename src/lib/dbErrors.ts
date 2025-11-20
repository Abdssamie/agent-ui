export class DBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DBError';
  }
}

export class DBInitializationError extends DBError {
  constructor() {
    super('Failed to initialize the database');
    this.name = 'DBInitializationError';
  }
}

export class DBTransactionError extends DBError {
  constructor(message: string) {
    super(message);
    this.name = 'DBTransactionError';
  }
}