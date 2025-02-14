import express from 'express';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

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

client.connect()
    .then(() => {
        console.log('Connected to the PostgreSQL database');
    })
    .catch((err) => {
        console.error('Connection error', err.stack);
    });

app.use(express.json());

export { app, client };
