import request from "supertest";
import { client, server } from "../../server";

jest.setTimeout(10000);

describe("Friend Request API", () => {
  let userId1: string;
  let userId2: string;
  let requestId: string;

  // Create test users before each test
  beforeAll(async () => {
    jest.setTimeout(10000);

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
      .post("/friend/request")
      .send({ userid: userId1, friendid: userId2 });

    expect(response.status).toBe(200);
    expect(response.body.request_id).toBeDefined();
    expect(response.body.ispending).toBe(true);
    requestId = response.body.request_id;
  });

  it("should return 400 when sending a friend request with missing data", async () => {
    const response = await request(server).post("/friend/request").send();

    expect(response.status).toBe(400);
  });

  it("should return 404 when sending a friend request for non-existing users", async () => {
    const response = await request(server)
      .post("/friend/request")
      .send({ userid: "9999", friendid: "9999" });

    expect(response.status).toBe(404);
    expect(response.text).toBe("User(s) not found");
  });

  it("should get the status of a friend request", async () => {
    const response = await request(server).get(
      `/friend/request/status?requestId=${requestId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.request_id).toBe(requestId);
    expect(response.body.ispending).toBe(true);
  });

  it("should accept a friend request", async () => {
    const response = await request(server)
      .post("/friend/accept")
      .send({ requestId });

    expect(response.status).toBe(200);
    expect(response.body.ispending).toBe(false);
  });

  it("should reject a friend request", async () => {
    const response = await request(server)
      .post("/friend/reject")
      .send({ requestId });

    expect(response.status).toBe(200);
    expect(response.body.ispending).toBe(false);
  });

  it("should return 404 when trying to accept a non-existing friend request", async () => {
    const response = await request(server)
      .post("/friend/accept")
      .send({ requestId: "9999" });

    expect(response.status).toBe(404);
    expect(response.text).toBe("Friend request not found");
  });

  it("should return 404 when trying to reject a non-existing friend request", async () => {
    const response = await request(server)
      .post("/friend/reject")
      .send({ requestId: "9999" });

    expect(response.status).toBe(404);
    expect(response.text).toBe("Friend request not found");
  });

  it("should return 404 when checking the status of a non-existing friend request", async () => {
    const response = await request(server).get(
      `/friend/request/status?requestId=9999`
    );

    expect(response.status).toBe(404);
    expect(response.text).toBe("Friend request not found");
  });
});
