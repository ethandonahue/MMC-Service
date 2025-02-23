import { client } from "../../server";
import { Router } from "express";

const router = Router();

// Create a league and add the user as a member
router.post("/league", async (req: any, res: any) => {
  const { leagueName, userId } = req.body;

  if (!leagueName || !userId) {
    return res.status(400).send("leagueName and userId are required");
  }

  try {
    const leagueCode = generateCode();

    const leagueQuery =
      "INSERT INTO leagues (league_name, league_code) VALUES ($1, $2) RETURNING *";
    const leagueValues = [leagueName, leagueCode];
    const leagueResult = await client.query(leagueQuery, leagueValues);
    const leagueId = leagueResult.rows[0].league_id;

    const memberQuery =
      "INSERT INTO league_members (league_id, userid) VALUES ($1, $2) RETURNING *";
    const memberValues = [leagueId, userId];
    await client.query(memberQuery, memberValues);

    res.status(200).json(leagueResult.rows[0]);
  } catch (error) {
    console.error("Error creating league and adding user:", error);
    res.status(500).send("Error creating league and adding user");
  }
});

// Get league by league id (no longer by league code)
router.get("/league", async (req: any, res: any) => {
  const { leagueId } = req.query;

  if (!leagueId) {
    return res.status(400).send("leagueId is required");
  }

  try {
    const query = "SELECT * FROM leagues WHERE league_id = $1";
    const values = [leagueId];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).send("League not found");
    }
  } catch (error) {
    console.error("Error retrieving league:", error);
    res.status(500).send("Error retrieving league");
  }
});

// Get all leagues
router.get("/leagues", async (req: any, res: any) => {
  try {
    const query = "SELECT * FROM leagues";

    const result = await client.query(query);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No leagues found");
    }
  } catch (error) {
    console.error("Error retrieving leagues:", error);
    res.status(500).send("Error retrieving leagues");
  }
});

// Add a user to a league
router.post("/league/member", async (req: any, res: any) => {
  const { leagueId, userId } = req.body;

  if (!leagueId || !userId) {
    return res.status(400).send("leagueId and userId are required");
  }

  try {
    const leagueQuery = "SELECT * FROM leagues WHERE league_id = $1";
    const leagueValues = [leagueId];
    const leagueResult = await client.query(leagueQuery, leagueValues);

    if (leagueResult.rows.length === 0) {
      return res.status(404).send("League not found");
    }

    const memberCheckQuery =
      "SELECT * FROM league_members WHERE league_id = $1 AND userid = $2";
    const memberCheckValues = [leagueId, userId];
    const memberCheckResult = await client.query(
      memberCheckQuery,
      memberCheckValues
    );

    if (memberCheckResult.rows.length > 0) {
      return res.status(400).send("User is already a member of the league");
    }

    const query =
      "INSERT INTO league_members (league_id, userid) VALUES ($1, $2) RETURNING *";
    const values = [leagueId, userId];

    const result = await client.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding user to league:", error);
    res.status(500).send("Error adding user to league");
  }
});

// Get members of a league by league id
router.get("/league/members", async (req: any, res: any) => {
  const { leagueId } = req.query;

  if (!leagueId) {
    return res.status(400).send("leagueId is required");
  }

  try {
    const leagueQuery = "SELECT * FROM leagues WHERE league_id = $1";
    const leagueValues = [leagueId];
    const leagueResult = await client.query(leagueQuery, leagueValues);

    if (leagueResult.rows.length === 0) {
      return res.status(404).send("League not found");
    }

    const query =
      "SELECT u.userid, u.username FROM league_members lm JOIN users u ON lm.userid = u.userid WHERE lm.league_id = $1";
    const values = [leagueId];

    const result = await client.query(query, values);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error retrieving league members:", error);
    res.status(500).send("Error retrieving league members");
  }
});

// Join a league by league code
router.post("/joinLeague", async (req: any, res: any) => {
  const { leagueCode, userId } = req.body;

  if (!leagueCode || !userId) {
    return res.status(400).send("leagueCode and userId are required");
  }

  try {
    const leagueQuery = "SELECT * FROM leagues WHERE league_code = $1";
    const leagueValues = [leagueCode];
    const leagueResult = await client.query(leagueQuery, leagueValues);

    if (leagueResult.rows.length === 0) {
      return res.status(404).send("League not found");
    }

    const leagueId = leagueResult.rows[0].league_id;

    const memberCheckQuery =
      "SELECT * FROM league_members WHERE league_id = $1 AND userid = $2";
    const memberCheckValues = [leagueId, userId];
    const memberCheckResult = await client.query(
      memberCheckQuery,
      memberCheckValues
    );

    if (memberCheckResult.rows.length > 0) {
      return res.status(400).send("User is already a member of the league");
    }

    const query =
      "INSERT INTO league_members (league_id, userid) VALUES ($1, $2) RETURNING *";
    const values = [leagueId, userId];

    const result = await client.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding user to league:", error);
    res.status(500).send("Error adding user to league");
  }
});

// Delete a league
router.delete("/league", async (req: any, res: any) => {
  const { leagueId } = req.query;

  if (!leagueId) {
    return res.status(400).send("leagueId is required");
  }

  try {
    const leagueQuery = "SELECT * FROM leagues WHERE league_id = $1";
    const leagueValues = [leagueId];
    const leagueResult = await client.query(leagueQuery, leagueValues);

    if (leagueResult.rows.length === 0) {
      return res.status(404).send("League not found");
    }

    const deleteLeagueQuery = "DELETE FROM leagues WHERE league_id = $1";
    const deleteLeagueValues = [leagueId];
    await client.query(deleteLeagueQuery, deleteLeagueValues);

    const deleteMembersQuery =
      "DELETE FROM league_members WHERE league_id = $1";
    await client.query(deleteMembersQuery, deleteLeagueValues);

    res.status(200).send("League successfully deleted");
  } catch (error) {
    console.error("Error deleting league:", error);
    res.status(500).send("Error deleting league");
  }
});

// Remove league member
router.delete("/league/member", async (req: any, res: any) => {
  const { leagueId, userId } = req.query;

  if (!leagueId || !userId) {
    return res.status(400).send("leagueId and userId are required");
  }

  try {
    const leagueQuery = "SELECT * FROM leagues WHERE league_id = $1";
    const leagueValues = [leagueId];
    const leagueResult = await client.query(leagueQuery, leagueValues);

    if (leagueResult.rows.length === 0) {
      return res.status(404).send("League not found");
    }

    const memberCheckQuery =
      "SELECT * FROM league_members WHERE league_id = $1 AND userid = $2";
    const memberCheckValues = [leagueId, userId];
    const memberCheckResult = await client.query(
      memberCheckQuery,
      memberCheckValues
    );

    if (memberCheckResult.rows.length === 0) {
      return res.status(404).send("User is not a member of the league");
    }

    const deleteMemberQuery =
      "DELETE FROM league_members WHERE league_id = $1 AND userid = $2";
    const deleteMemberValues = [leagueId, userId];
    await client.query(deleteMemberQuery, deleteMemberValues);

    res.status(200).send("User successfully removed from the league");
  } catch (error) {
    console.error("Error removing user from league:", error);
    res.status(500).send("Error removing user from league");
  }
});

// Get leagues the user is not part of
router.get("/leagues/not-joined", async (req: any, res: any) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send("userId is required");
  }

  try {
    const query = `
      SELECT * FROM leagues 
      WHERE league_id NOT IN (
        SELECT league_id FROM league_members WHERE userid = $1
      )
    `;
    const values = [userId];

    const result = await client.query(query, values);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).send("No leagues found that the user is not part of");
    }
  } catch (error) {
    console.error("Error retrieving leagues not joined by user:", error);
    res.status(500).send("Error retrieving leagues");
  }
});

function generateCode(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      result += characters[randomIndex];
  }
  return result;
}


export default router;
