import { client } from "../../server";
import { Router } from "express";

const router = Router();

// Set a mission as complete for a user
router.post("/mission/complete", async (req: any, res: any) => {
  const { userId, missionId } = req.body;

  if (!userId || !missionId) {
    return res.status(400).send("userId and missionId are required");
  }

  try {
    const query = `
      INSERT INTO user_completed_missions (user_id, mission_id, completed_at)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;  
    const values = [userId, missionId];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json({ message: "Mission marked as complete", mission: result.rows[0] });
    } else {
      res.status(404).send("Mission not found or already completed");
    }
  } catch (error) {
    console.error("Error updating mission status:", error);
    res.status(500).send("Error updating mission status");
  }
});

// Get all missions for a user
router.get("/missions", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  try {
    const query = `
      SELECT m.id, m.name AS mission_name, 
            CASE 
              WHEN um.completed_at IS NOT NULL THEN TRUE 
              ELSE FALSE 
            END as completed
      FROM daily_missions m
      LEFT JOIN user_completed_missions um 
      ON m.id = um.mission_id AND um.user_id = $1;
    `;

    const values = [userId];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No missions found for the user");
    }
  } catch (error) {
    console.error("Error retrieving missions:", error);
    res.status(500).send("Error retrieving missions");
  }
});

export default router;
