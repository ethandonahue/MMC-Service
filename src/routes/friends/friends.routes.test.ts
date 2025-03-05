import request from "supertest";
import { client, server } from "../../server";


describe("Friend Request API", () => {
  let userId1: string;
  let userId2: string;
  let requestId: string;

  // Create test users before each test
  beforeAll(async () => {
    const response1 = await request(server)
      .post("/user")
      .send({ username: "testuser1", profilePicId: "pic123" });

    expect(response1.status).toBe(200);
    expect(response1.body.userid).toBeDefined();
    userId1 = response1.body.userid;

    const response2 = await request(server)
      .post("/user")
      .send({ username: "testuser2", profilePicId: "pic456" });

    expect(response2.status).toBe(200);
    expect(response2.body.userid).toBeDefined();
    userId2 = response2.body.userid;
  });

  // Delete the test users after all tests
  afterAll(async () => {
    if (userId1) {
      const deleteUserResponse = await request(server).delete(
        `/user?userId=${userId1}`
      );
      expect(deleteUserResponse.status).toBe(200);
    }

    if (userId2) {
      const deleteUserResponse = await request(server).delete(
        `/user?userId=${userId2}`
      );
      expect(deleteUserResponse.status).toBe(200);
    }

    client.end();
  });

  it("should send a friend request successfully", async () => {
    const response = await request(server)
      .post("/friend/send")
      .send({ userid: userId1, friendid: userId2 });

    expect(response.status).toBe(200);
    expect(response.body.request_id).toBeDefined();
    expect(response.body.ispending).toBe(true);
    requestId = response.body.request_id;
  });

  it("should return 400 when sending a friend request with missing data", async () => {
    const response = await request(server).post("/friend/send").send();

    expect(response.status).toBe(400);
  });

  it("should return 404 when sending a friend request for non-existing users", async () => {
    const response = await request(server)
      .post("/friend/send")
      .send({ userid: "9998", friendid: "9999" });

    expect(response.status).toBe(404);
  });

  it("should accept a friend request", async () => {
    const response = await request(server)
      .post("/friend/accept")
      .send({ request_id: requestId });

    expect(response.status).toBe(200);
  });

  it("should return 400 when trying to accept a non-existing friend request", async () => {
    const response = await request(server)
      .post("/friend/accept")
      .send({ requestId: "9999" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when trying to reject a non-existing friend request", async () => {
    const response = await request(server)
      .post("/friend/reject")
      .send({ requestId: "9999" });

    expect(response.status).toBe(400);
  });
});
