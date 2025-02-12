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

app.use(express.json());

//#region Users

// Create user
app.post('/user', async (req: any, res: any) => {
    const { username, profilePicId } = req.body;

    if (!username) {
        return res.status(400).send('username is required');
    }

    try {
        const checkQuery = 'SELECT * FROM Users WHERE username ILIKE $1';
        const checkValues = [username];
        const checkResult = await client.query(checkQuery, checkValues);

        if (checkResult.rows.length > 0) {
            return res.status(400).send('Username already exists');
        }

        const query = 'INSERT INTO Users (username, profilePicId) VALUES ($1, $2) RETURNING *';
        const values = [username, profilePicId];

        const result = await client.query(query, values);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error inserting user:', error);
        res.status(500).send('Error inserting user');
    }
});

// Get user by userId
app.get('/user', async (req: any, res: any) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('userId is required');
    }

    if (isNaN(userId)) {
        return res.status(400).send('Invalid userId');
    }

    try {
        const query = 'SELECT * FROM Users WHERE userId = $1';
        const values = [userId];

        const result = await client.query(query, values);

        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error retrieving user:', error);
        res.status(500).send('Error retrieving user');
    }
});

// Get all users
app.get('/users', async (req: any, res: any) => {
    try {
        const query = 'SELECT * FROM Users';

        const result = await client.query(query);

        if (result.rows.length > 0) {
            res.status(200).json(result.rows);
        } else {
            res.status(404).send('No users found');
        }
    } catch (error) {
        console.error('Error retrieving users:', error);
        res.status(500).send('Error retrieving users');
    }
});

// Delete user by userId
app.delete('/user', async (req: any, res: any) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('userId is required');
    }

    if (isNaN(userId)) {
        return res.status(400).send('Invalid userId');
    }

    try {
        const query = 'DELETE FROM Users WHERE userId = $1 RETURNING *';
        const values = [userId];

        const result = await client.query(query, values);

        if (result.rowCount && result.rowCount > 0) {
            res.status(200).send('User deleted');
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Error deleting user');
    }
});

//#endregion

app.listen(port, () => {
    console.log(`Express is listening at http://localhost:${port}`);
});

export { app };
