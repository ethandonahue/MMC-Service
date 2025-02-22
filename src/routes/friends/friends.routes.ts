import { client } from "../../server";
import { Router } from "express";

const router = Router();

// Send a friend request
router.post("/send", async (req: any, res: any) => {
  const { userid, friendid } = req.body;

  if (!userid || !friendid) {
    return res.status(400).send("Both userid and friendid are required");
  }

  if (userid === friendid) {
    return res
      .status(400)
      .send("You cannot send a friend request to yourself.");
  }

  try {
    const checkQuery =
      "SELECT * FROM friend_requests WHERE userid = $1 AND friendid = $2 AND ispending = TRUE";
    const checkValues = [userid, friendid];
    const checkResult = await client.query(checkQuery, checkValues);

    if (checkResult.rows.length > 0) {
      return res
        .status(400)
        .send("Friend request already exists and is pending.");
    }

    const query =
      "INSERT INTO friend_requests (userid, friendid, ispending) VALUES ($1, $2, TRUE) RETURNING *";
    const values = [userid, friendid];

    const result = await client.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).send("Error sending friend request");
  }
});

// Accept a friend request
router.post("/accept", async (req: any, res: any) => {
  const { request_id, user_id, friend_id } = req.body;

  if (!request_id) {
    return res.status(400).send("request_id is required");
  }

  try {
    const query =
      "DELETE FROM friend_requests WHERE request_id = $1 RETURNING *";
    const values = [request_id];

    const result = await client.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      const addFriendQuery =
      "INSERT INTO friends (userid, friendid) VALUES ($1, $2) RETURNING *";
      
      const addFriendValues = [user_id, friend_id];
      const addFriendResult = await client.query(addFriendQuery, addFriendValues);
      
      if (addFriendResult.rowCount && addFriendResult.rowCount > 0) {
        res.status(200).json({ message: "Friend request accepted." });
      } else {
        res.status(404).send("Friend request not found or already processed.");
      }
    } else {
      res.status(404).send("Friend request not found or already processed.");
    }

  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).send("Error accepting friend request");
  }
});

// Reject a friend request
router.post("/reject", async (req: any, res: any) => {
  const { request_id } = req.body;

  if (!request_id) {
    return res.status(400).send("request_id is required");
  }

  try {
    const query =
      "DELETE FROM friend_requests WHERE request_id = $1 AND ispending = TRUE RETURNING *";
    const values = [request_id];

    const result = await client.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      res.status(200).json({ message: "Friend request rejected." });
    } else {
      res.status(404).send("Friend request not found or already processed.");
    }
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).send("Error rejecting friend request");
  }
});

// Get all friend requests for a user
router.get("/requests", async (req: any, res: any) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).send("userid is required");
  }

  try {
    const query =
      "SELECT * FROM friend_requests WHERE userid = $1 OR friendid = $1";
    const values = [userid];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No friend requests found");
    }
  } catch (error) {
    console.error("Error retrieving friend requests:", error);
    res.status(500).send("Error retrieving friend requests");
  }
});

// Get all pending friend requests for a user
router.get("/requests/pending", async (req: any, res: any) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).send("userid is required");
  }

  try {
    const query =
      "SELECT * FROM friend_requests WHERE friendid = $1";
    const values = [userid];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows)
    } else {
      res.status(404).send("No friend requests found");
    }
  } catch (error) {
    console.error("Error retrieving friend requests:", error);
    res.status(500).send("Error retrieving friend requests");
  }
});

// Get all friend requests sent from a user
router.get("/requests/sent", async (req: any, res: any) => {
  const { userid } = req.query;

  if (!userid) {
    return res.status(400).send("userid is required");
  }

  try {
    const query =
      "SELECT * FROM friend_requests WHERE userid = $1";
    const values = [userid];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No friend requests found");
    }
  } catch (error) {
    console.error("Error retrieving friend requests:", error);
    res.status(500).send("Error retrieving friend requests");
  }
});

// Delete a friend request
router.delete("/request", async (req: any, res: any) => {
  const { request_id } = req.query;

  if (!request_id) {
    return res.status(400).send("request_id is required");
  }

  try {
    const query =
      "DELETE FROM friend_requests WHERE request_id = $1 RETURNING *";
    const values = [request_id];

    const result = await client.query(query, values);

    if (result.rowCount && result.rowCount > 0) {
      res.status(200).send("Friend request deleted");
    } else {
      res.status(404).send("Friend request not found");
    }
  } catch (error) {
    console.error("Error deleting friend request:", error);
    res.status(500).send("Error deleting friend request");
  }
});

// Get all friend ids of a user by userid
router.get("/", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  if (isNaN(userId)) {
    return res.status(400).send("Invalid userId");
  }

  try {
    const query = "SELECT * FROM friends WHERE userid = $1";
    const values = [userId];
    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      const friendIds = result.rows.map(row => row.friendid);
      res.status(200).json(friendIds);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error retrieving user's friends:", error);
    res.status(500).send("Error retrieving user's friends");
  }

})

export default router;
