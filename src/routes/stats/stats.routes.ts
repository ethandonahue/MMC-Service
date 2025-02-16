import { client } from "../../server";
import { Router } from "express";

const router = Router();

router.post("/userGameSession", async (req: any, res: any) => {
  const { userId, score, timePlayed } = req.body;

  if (!userId || !score || !timePlayed) {
    return res.status(400).send("userId, score, and timePlayed are required");
  }

  if (isNaN(userId) || isNaN(score)) {
    return res
      .status(400)
      .send("userId, score, and timePlayed must be numeric");
  }

  try {
    const userCheckQuery = "SELECT * FROM Users WHERE userid = $1";
    const userCheckValues = [userId];
    const userCheckResult = await client.query(userCheckQuery, userCheckValues);

    if (userCheckResult.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    const currentUtcTime = new Date().toISOString();

    const query = `
            INSERT INTO game_sessions (user_id, score, time_played, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING user_id, score, TO_CHAR(time_played, 'HH24:MI:SS') AS time_played, created_at`;

    const values = [userId, score, timePlayed, currentUtcTime];
    const result = await client.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting game session:", error);
    res.status(500).send("Error inserting game session");
  }
});

// GET: User's best score and total time played
router.get("/userStatistics", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  try {
    const query = `
            SELECT 
                MAX(score) AS best_score, 
                TO_CHAR(SUM(time_played), 'HH24:MI:SS') AS total_time_played
            FROM game_sessions 
            WHERE user_id = $1
            GROUP BY user_id
        `;
    const values = [userId];
    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).send("User statistics not found");
    }
  } catch (error) {
    console.error("Error retrieving user statistics:", error);
    res.status(500).send("Error retrieving user statistics");
  }
});

// DELETE: Remove all game sessions for a user
router.delete("/userGameSessions", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  try {
    const query = "DELETE FROM game_sessions WHERE user_id = $1 RETURNING *";
    const values = [userId];
    const result = await client.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      res.status(200).send("All game sessions deleted");
    } else {
      res.status(404).send("No game sessions found for this user");
    }
  } catch (error) {
    console.error("Error deleting game sessions:", error);
    res.status(500).send("Error deleting game sessions");
  }
});

// GET: Top X scores from all users
router.get("/topScores", async (req: any, res: any) => {
  const { limit = 10 } = req.query;

  if (isNaN(limit) || limit <= 0) {
    return res.status(400).send("Invalid limit");
  }

  try {
    const query = `
            SELECT u.username, u.profilepicid, gs.score
            FROM game_sessions gs
            JOIN users u ON gs.user_id = u.userid
            ORDER BY gs.score DESC
            LIMIT $1
        `;
    const values = [parseInt(limit)];
    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No top scores found");
    }
  } catch (error) {
    console.error("Error retrieving top scores:", error);
    res.status(500).send("Error retrieving top scores");
  }
});

export default router;
