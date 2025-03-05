import request from "supertest";
import { client, server } from "../../server";

describe("League API", () => {
  let userId: string;
  let leagueId: string;
  let leagueCode: string;

  // Create a test user before each test
  beforeAll(async () => {
    const response = await request(server)
      .post("/user")
      .send({ username: "test", profilePicId: "pic123" });

    expect(response.status).toBe(200);
    expect(response.body.userid).toBeDefined();
    userId = response.body.userid;
  });

  // Create a test league before each test
  beforeAll(async () => {
    const response = await request(server)
      .post("/league")
      .send({ leagueName: "Test League", userId: userId });

    expect(response.status).toBe(200);
    expect(response.body.league_id).toBeDefined();
    leagueId = response.body.league_id;
    leagueCode = response.body.league_code;
  });

  // Delete the test user and league
  afterAll(async () => {
    if (userId) {
      const deleteUserResponse = await request(server).delete(
        `/user?userId=${userId}`
      );
      expect(deleteUserResponse.status).toBe(200);
    }

    if (leagueId) {
      const deleteLeagueResponse = await request(server).delete(
        `/league?leagueId=${leagueId}`
      );
      expect(deleteLeagueResponse.status).toBe(200);
    }

    client.end();
  });

  it("should return 400 when creating a league with missing data", async () => {
    const response = await request(server).post("/league").send();

    expect(response.status).toBe(400);
  });

  it("should get details of a league by leagueId", async () => {
    const response = await request(server).get(`/league?leagueId=${leagueId}`);

    expect(response.status).toBe(200);
    expect(response.body.league_id).toBe(leagueId);
    expect(response.body.league_name).toBe("Test League");
  });

  it("should return 404 when getting a non-existing league", async () => {
    const response = await request(server).get(`/league?leagueId=9999`);
    expect(response.status).toBe(404);
  });

  it("should return 404 when trying to join a non-existing league", async () => {
    const response = await request(server)
      .post("/league/member")
      .send({ userId, leagueId: 9999 });

    expect(response.status).toBe(404);
  });

  it("should get all members of a league", async () => {
    const response = await request(server).get(
      `/league/members?leagueId=${leagueId}`
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return 404 when trying to delete a non-existing league", async () => {
    const deleteResponse = await request(server).delete(
      "/league?leagueId=9999"
    );
    expect(deleteResponse.status).toBe(404);
  });

  it("should return 400 if leagueCode or userId is missing when joining a league", async () => {
    const response = await request(server).post("/joinLeague").send({});

    expect(response.status).toBe(400);
    expect(response.text).toBe("leagueCode and userId are required");
  });

  it("should return 404 when trying to join a non-existing league", async () => {
    const response = await request(server)
      .post("/joinLeague")
      .send({ leagueCode: "INVALID_CODE", userId });

    expect(response.status).toBe(404);
    expect(response.text).toBe("League not found");
  });

  it("should remove a user from the league", async () => {
    await request(server).post("/league/member").send({ userId, leagueId });

    const response = await request(server)
      .delete("/league/member")
      .query({ leagueId, userId });

    expect(response.status).toBe(200);
    expect(response.text).toBe("User successfully removed from the league");
  });

  it("should join a league for an existing user", async () => {
    const response = await request(server)
      .post("/joinLeague")
      .send({ leagueCode, userId });

    expect(response.status).toBe(200);
    expect(response.body.userid).toBe(userId);
    expect(response.body.league_id).toBe(leagueId);
  });
});
