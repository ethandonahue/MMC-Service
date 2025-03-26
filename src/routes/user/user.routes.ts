import { client } from "../../server";
import { Router } from "express";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Create user
router.post("/user", async (req: any, res: any) => {
  const { username, profilePicId } = req.body;

  if (!username) {
    return res.status(400).send("username is required");
  }

  try {
    const checkQuery = "SELECT * FROM Users WHERE username ILIKE $1";
    const checkValues = [username];
    const checkResult = await client.query(checkQuery, checkValues);

    if (checkResult.rows.length > 0) {
      return res.status(400).send("Username already exists");
    }

    const query =
      "INSERT INTO Users (username, profilePicId) VALUES ($1, $2) RETURNING *";
    const values = [username, profilePicId];

    const result = await client.query(query, values);

    if (process.env.NODE_ENV !== "test") {
      const newUser = result.rows[0];

      const randomUserQuery =
        "SELECT userid FROM Users WHERE userid != $1 ORDER BY RANDOM() LIMIT 1";
      const randomUserResult = await client.query(randomUserQuery, [
        newUser.userid,
      ]);

      if (randomUserResult.rows.length > 0) {
        const randomFriendId = randomUserResult.rows[0].userid;
        await client.query(
          "INSERT INTO friend_requests (userid, friendid, ispending) VALUES ($2, $1, TRUE)",
          [newUser.userid, randomFriendId]
        );
      }

      const gameSessions = [
        { score: 500, timePlayed: 1.5 * 3600, daysAgo: 0 },
        { score: 10, timePlayed: 2 * 3600, daysAgo: 5 },
        { score: 1000, timePlayed: 3 * 3600, daysAgo: 20 }
    ];
    
    gameSessions.forEach(async ({ score, timePlayed, daysAgo }) => {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        const currentUtcTime = createdAt.toISOString();
    
        const gameSessionQuery = `
        INSERT INTO game_sessions (user_id, game_id, score, time_played, created_at)
        VALUES ($1, $2, $3, MAKE_INTERVAL(secs := $4), $5)
        RETURNING user_id, score, TO_CHAR(time_played, 'HH24:MI:SS') AS time_played, created_at`;
    
        const gameSessionValues = [
            newUser.userid,
            1,
            score,
            timePlayed,
            currentUtcTime,
        ];
    
        await client.query(gameSessionQuery, gameSessionValues);
    });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).send("Error inserting user");
  }
});

// Get user by userId
router.get("/user", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  try {
    const query = "SELECT * FROM Users WHERE userId = $1";
    const values = [userId];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).send("Error retrieving user");
  }
});

// Get all users
router.get("/users", async (req: any, res: any) => {
  try {
    const query = "SELECT * FROM Users";

    const result = await client.query(query);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No users found");
    }
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).send("Error retrieving users");
  }
});

// Delete user by userId
router.delete("/user", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  try {
    const query = "DELETE FROM Users WHERE userId = $1 RETURNING *";
    const values = [userId];

    const result = await client.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      res.status(200).send("User deleted");
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send("Error deleting user");
  }
});

// Get userId by username
router.get("/userId", async (req: any, res: any) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send("Username is required");
  }

  try {
    const query = "SELECT userId FROM Users WHERE username = $1";
    const values = [username];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json({ userId: result.rows[0].userid });
    } else {
      res.status(404).send("Username not found");
    }
  } catch (error) {
    console.error("Error retrieving userId:", error);
    res.status(500).send("Error retrieving userId");
  }
});

// Update username and profile picture
router.put("/user", async (req: any, res: any) => {
  const { userId } = req.query;
  const { newUsername, newProfilePicId } = req.body;

  if (!newUsername && !newProfilePicId) {
    return res
      .status(400)
      .send(
        "At least one field (newUsername or profilePicId) is required for update."
      );
  }
  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }
  try {
    const query = `UPDATE Users SET username = $1, profilePicId = $2 WHERE userId = $3 RETURNING *;`;
    const values = [newUsername, newProfilePicId, userId];
    const updateResult = await client.query(query, values);
    if (
      (updateResult.rows[0].username =
        newUsername && updateResult.rows[0].profilepicid == newProfilePicId)
    ) {
      res.status(200).json("Updated username and profile picture");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Error updating user");
  }
});

export default router;
