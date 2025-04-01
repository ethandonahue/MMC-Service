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

// GET: User's best scores and total time played within a given number of days
router.get("/userStatistics", async (req: any, res: any) => {
  const { userId, days } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  const daysAgo = days ? parseInt(days, 10) : 1;

  try {
    const totalTimeQuery = `
      SELECT 
        TO_CHAR(SUM(time_played), 'HH24:MI:SS') AS total_time_played
      FROM game_sessions
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '1 day' * $2;
    `;
    const totalTimeParams = [userId, daysAgo];

    const totalTimeResult = await client.query(totalTimeQuery, totalTimeParams);

    const totalTimePlayed =
      totalTimeResult.rows[0]?.total_time_played || "00:00:00";

    const highScoreQuery = `
      SELECT 
        gs.game_id,
        g.name AS game_name,
        g.icon_name AS icon,
        gs.score,
        EXTRACT(HOUR FROM SUM(gs.time_played)) AS hours,
        gs.session_id
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.user_id = $1
        AND gs.created_at >= NOW() - INTERVAL '1 day' * $2
        AND gs.score = (
          SELECT MAX(score)
          FROM game_sessions
          WHERE user_id = $1
            AND created_at >= NOW() - INTERVAL '1 day' * $2
            AND game_id = gs.game_id
        )
      GROUP BY gs.game_id, g.name, g.icon_name, gs.score, gs.session_id
      ORDER BY gs.score DESC;
    `;
    const highScoreParams = [userId, daysAgo];

    const topScoresResult = await client.query(highScoreQuery, highScoreParams);

    const scores = topScoresResult.rows.map((row) => ({
      gameName: row.game_name,
      icon: row.icon,
      score: row.score,
      hours: parseInt(row.hours, 10) || 0,
      sessionId: row.session_id,
    }));

    const response = {
      total_time_played: totalTimePlayed,
      scores: scores,
    };

    res.status(200).send(response);
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

router.get("/games", async (req: any, res: any) => {
  const { playCountType = "everyone", userId } = req.query;

  if (playCountType !== "everyone" && playCountType !== "me") {
    return res
      .status(400)
      .send("Invalid playCountType. Use 'everyone' or 'me'.");
  }

  let additionalWhereClause = "";

  if (playCountType === "me" && !userId) {
    return res.status(400).send("userId is required for 'me' playCountType.");
  }

  if (playCountType === "me" && userId) {
    additionalWhereClause = `AND (gs.user_id = 630 OR gs.game_id IS NULL)`;
  }

  try {
    const query = `
      SELECT g.id AS game_id, COUNT(gs.game_id) AS session_count
      FROM games g
      LEFT JOIN game_sessions gs ON gs.game_id = g.id
      ${
        playCountType === "me"
          ? "LEFT JOIN users u ON gs.user_id = u.userid"
          : ""
      }
      WHERE 1=1
      ${additionalWhereClause}
      GROUP BY g.id;
    `;

    const result = await client.query(query);

    if (result.rows.length > 0) {
      const formattedResult = result.rows.map((row) => ({
        game_id: row.game_id,
        name: row.name,
        icon_name: row.icon_name,
        session_count: parseInt(row.session_count, 10),
      }));

      res.status(200).json(formattedResult);
    } else {
      res.status(404).send("No game sessions found");
    }
  } catch (error) {
    console.error("Error retrieving game popularity:", error);
    res.status(500).send("Error retrieving game popularity");
  }
});

export default router;
