import express from 'express';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// PostgreSQL client setup
const client = new Client({
    user: 'postgres',
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PW,
    port: parseInt(process.env.DB_PORT as string),
    ssl: {
        rejectUnauthorized: false
    }
});

// Connect to the PostgreSQL database
client.connect()
    .then(() => {
        console.log('Connected to the PostgreSQL database');
    })
    .catch((err) => {
        console.error('Connection error', err.stack);
    });

// This is just a test to see if db works
app.get('/test', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM newtable');
        res.json(result.rows);
    } catch (error) {
        console.error('Error retrieving rows:', error);
        res.status(500).send('Error retrieving rows');
    }
});

app.listen(port, () => {
    console.log(`Express is listening at http://localhost:${port}`);
});
