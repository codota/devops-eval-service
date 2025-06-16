import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

console.log("Starting server...");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost/postgres',
});

// Initialize database
async function initDatabase() {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
    try {
        // Check database connectivity
        const result = await pool.query('SELECT 1 as health_check');

        if (result.rows.length > 0 && result.rows[0].health_check === 1) {
            res.json({
                status: 'ready',
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Database health check failed');
        }
    } catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'not ready',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = await pool.query(
            'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
            [title, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, completed } = req.body;

        const result = await pool.query(
            'UPDATE tasks SET title = $1, description = $2, completed = $3 WHERE id = $4 RETURNING *',
            [title, description, completed, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
async function startServer() {
    console.log("Initializing database...");
    await initDatabase();
    console.log("Listening for incoming requests on port ${port}...");
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

startServer().catch(console.error);