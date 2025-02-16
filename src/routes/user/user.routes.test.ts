import request from "supertest";
import { server } from "../../server";

jest.setTimeout(10000);

describe("User API", () => {
  let userId: string;

  //Create a test user before each test
  beforeAll(async () => {
    const response = await request(server)
      .post("/user")
      .send({ username: "test", profilePicId: "pic123" });

    expect(response.status).toBe(200);

    expect(response.body.userid).toBeDefined();

    userId = response.body.userid;
  });

  //Delete the test user
  afterAll(async () => {
    if (userId) {
      const deleteResponse = await request(server).delete(
        `/user?userId=${userId}`
      );
      expect(deleteResponse.status).toBe(200);
    }
  });

  it("should retrieve all users", async () => {
    const response = await request(server).get("/users");

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("should create a user", async () => {
    expect(userId).toBeDefined();
  });

  it("should retrieve a user by userId", async () => {
    const getResponse = await request(server).get(`/user?userId=${userId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.userid).toBe(userId);
    expect(getResponse.body.username).toBe("test");
  });

  it("should return 400 when username is missing in user creation", async () => {
    const response = await request(server)
      .post("/user")
      .send({ profilePicId: "pic123" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when username is duplicate", async () => {
    const response = await request(server)
      .post("/user")
      .send({ username: "test", profilePicId: "pic123" });

    expect(response.status).toBe(400);
  });

  it("should return 404 when trying to delete a non-existing user", async () => {
    const deleteResponse = await request(server).delete(`/user?userId=9999`);

    expect(deleteResponse.status).toBe(404);
  });

  it("should return 400 when userId is invalid in GET request", async () => {
    const getResponse = await request(server).get("/user?userId=invalidId");

    expect(getResponse.status).toBe(400);
  });

  it("should return 400 when userId is invalid in DELETE request", async () => {
    const deleteResponse = await request(server).delete(
      "/user?userId=invalidId"
    );

    expect(deleteResponse.status).toBe(400);
  });
});
