import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

export class DatabaseConnection {
  private pool: Pool;
  private initialized: boolean = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 
      'postgresql://localhost:5432/shelf_patterns';
    
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test connection
      await this.pool.query('SELECT NOW()');
      
      // Run schema creation
      const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      
      // Split by semicolons but be careful with functions
      const statements = schema
        .split(/;\s*$(?![^$]*\$\$)/m)
        .filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.pool.query(statement);
        }
      }
      
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new DatabaseConnection();