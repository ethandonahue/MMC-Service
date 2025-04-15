import { client } from "../../server";
import { Router } from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const router = Router();

const SALT_ROUNDS = 10;

// Create user with password
router.post("/user", async (req: any, res: any) => {
  const { username, password, profilePicId } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  try {
    const checkQuery = "SELECT * FROM Users WHERE username ILIKE $1";
    const checkValues = [username];
    const checkResult = await client.query(checkQuery, checkValues);

    if (checkResult.rows.length > 0) {
      return res.status(400).send("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const query =
      "INSERT INTO Users (username, password, profilePicId) VALUES ($1, $2, $3) RETURNING *";
    const values = [username, hashedPassword, profilePicId];
    const result = await client.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error inserting user:", error);
    res.status(500).send("Error inserting user");
  }
});

// Sign in user
router.post("/signin", async (req: any, res: any) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required");
  }

  try {
    const query = "SELECT * FROM Users WHERE username = $1";
    const values = [username];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).send("Incorrect password");
    }

    res.status(200).json({ userId: user.userid, username: user.username });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).send("Error during sign-in");
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

// Get badges
router.get("/badges", async (req: any, res: any) => {
  const { userId } = req.query;

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }
  try {
    const query = `SELECT badges FROM Users WHERE userId = $1;`;
    const values = [userId];
    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).send("Badges not found");
    }
  } catch (error) {
    console.error("Error retrieving badges:", error);
    res.status(500).send("Error retrieving badges");
  }
});

// Update badge
router.put("/badges", async (req: any, res: any) => {
  const { userId } = req.query
  const { badge } = req.body

  if (!badge) {
    return res
      .status(400)
      .send(
        "Badge name is required for update."
      );
  }
  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  try {
    const query = `UPDATE Users SET badges = array_append(badges, $1) WHERE userId = $2 RETURNING *;`;
    const values = [badge, userId];
    const updateResult = await client.query(query, values);
    if (updateResult.rowCount != null && updateResult.rowCount > 0) {
      res.status(200).json("Updated badge");
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error adding badge for the user:", error);
    res.status(500).send("Error adding badge for the user");
  }
})

export default router;
