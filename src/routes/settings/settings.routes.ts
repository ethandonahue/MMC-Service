import { client } from "../../server";
import { Router } from "express";

const router = Router();

router.get("/appSettings", async (req: any, res: any) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send("userId is required");
    }

    if (isNaN(userId)) {
        return res.status(400).send("Invalid userId");
    }

    try {
        const query = `
            SELECT *
            FROM app_settings
            WHERE user_id = $1
        `;
        const values = [userId];
        const result = await client.query(query, values);

        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send("App settings not found");
        }
    } catch (error) {
        console.error("Error retrieving app settings: ", error);
        res.status(500).send("Error retrieving app settings");
    }
});

router.post("/appSettings", async (req: any, res: any) => {
    const { userId, audioLevel, language, theme, mode } = req.body;

    if (!userId || !audioLevel || !language || !theme || !mode) {
        return res.status(400).send("userId, audioLevel, language, theme, and mode are required");
    }

    if (isNaN(userId) || isNaN(audioLevel)) {
        return res.status(400).send("userId and audioLevel must be numeric");
    }

    try {
        const userCheckQuery = "SELECT * FROM Users WHERE userid = $1";
        const userCheckValues = [userId];
        const userCheckResult = await client.query(userCheckQuery, userCheckValues);

        if (userCheckResult.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const query = `
            INSERT INTO app_settings (user_id, audio_level, language, theme, mode)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id)
            DO UPDATE SET audio_level = $2, language = $3, theme = $4, mode = $5
        `;

        const values = [userId, audioLevel, language, theme, mode];
        const result = await client.query(query, values);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating app settings: ", error);
        res.status(500).send("Error updating app settings");
    }
});

router.get("/gameSettings", async (req: any, res: any) => {
    const { userId, gameId } = req.query;

    if (!userId || !gameId) {
        return res.status(400).send("userId and gameId are required");
    }

    if (isNaN(userId) || isNaN(gameId)) {
        return res.status(400).send("userId and gameId must be numeric");
    }

    try {
        const query = `
            SELECT *
            FROM game_settings
            WHERE user_id = $1 AND game_id = $2
        `;
        const values = [userId, gameId];
        const result = await client.query(query, values);

        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).send(`Game ${gameId} settings not found`);
        }
    } catch (error) {
        console.error(`Error retrieving game ${gameId} settings: ${error}`);
        res.status(500).send(`Error retrieving game ${gameId} settings`);
    }
});

router.post("/gameSettings", async (req: any, res: any) => {
    const { userId, gameId, difficulty, theme } = req.body;

    if (!userId || !gameId || !difficulty || !theme) {
        return res.status(400).send("userId, gameId, difficulty, and theme are required");
    }

    if (isNaN(userId) || isNaN(gameId)) {
        return res.status(400).send("userId and gameId must be numeric");
    }

    try {
        const userCheckQuery = "SELECT * FROM Users WHERE userid = $1";
        const userCheckValues = [userId];
        const userCheckResult = await client.query(userCheckQuery, userCheckValues);

        if (userCheckResult.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        const query = `
            INSERT INTO game_settings (user_id, game_id, difficulty, theme)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, game_id)
            DO UPDATE SET difficulty = $3, theme = $4
        `;

        const values = [userId, gameId, difficulty, theme];
        const result = await client.query(query, values);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`Error updating game ${gameId} settings: ${error}`);
        res.status(500).send(`Error updating game ${gameId} settings`);
    }
});

export default router;