import request from 'supertest';
import { app } from '../../server';

describe('Stats API', () => {
    let userId: string;

    //Create a test user before each test
    beforeAll(async () => {
        const response = await request(app)
            .post('/user')
            .send({ username: 'test', profilePicId: 'pic123' });

        expect(response.status).toBe(200);

        expect(response.body.userid).toBeDefined();

        userId = response.body.userid;
    });

    //Delete the test user
    afterAll(async () => {
        if (userId) {
            const deleteResponse = await request(app).delete(`/user?userId=${userId}`);
            expect(deleteResponse.status).toBe(200);
        }
    });

    it('should create a game session for an existing user', async () => {
        const response = await request(app)
            .post('/user/gamesession')
            .send({ userId, score: 500, timePlayed: '01:00:00' });

        expect(response.status).toBe(200);
        expect(response.body.user_id).toBe(userId);
        expect(response.body.score).toBe(500);
        expect(response.body.time_played).toBe('01:00:00');
    });

    it('should return 404 when creating a game session for a non-existing user', async () => {
        const response = await request(app)
            .post('/user/gamesession')
            .send({ userId: 9999, score: 500, timePlayed: '01:00:00' });

        expect(response.status).toBe(404);
    });

    it('should delete all game sessions for a user', async () => {
        await request(app)
            .post('/user/gamesession')
            .send({ userId, score: 500, timePlayed: '01:00:00' });

        const deleteResponse = await request(app).delete(`/user/gamesessions?userId=${userId}`);
        expect(deleteResponse.status).toBe(200);
    });

    it('should return 404 when trying to delete game sessions for a non-existing user', async () => {
        const deleteResponse = await request(app).delete('/user/gamesessions?userId=9999');
        expect(deleteResponse.status).toBe(404);
    });

    it('should get the best score and total time played for the user', async () => {
        await request(app)
            .post('/user/gamesession')
            .send({ userId, score: 1500, timePlayed: '02:00:00' });

        const response = await request(app).get(`/user/statistics?userId=${userId}`);

        expect(response.status).toBe(200);
        expect(response.body.best_score).toBe(1500);
        expect(response.body.total_time_played).toBe('02:00:00');
    });

    it('should return 404 if the user has no game sessions when retrieving stats', async () => {
        const response = await request(app).get(`/user/statistics?userId=9999`);

        expect(response.status).toBe(404);
    });

    it('should return top X scores from all users', async () => {
        await request(app)
            .post('/user/gamesession')
            .send({ userId, score: 500, timePlayed: '01:00:00' });

        const deleteResponse = await request(app).delete(`/user/gamesessions?userId=${userId}`);
        expect(deleteResponse.status).toBe(200);

        await request(app)
            .post('/user/gamesession')
            .send({ userId, score: 500, timePlayed: '01:00:00' });
        const response = await request(app).get('/top-scores?limit=1');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].score).toBe(500);
    });

    it('should return 400 when the limit for top scores is invalid', async () => {
        const response = await request(app).get('/top-scores?limit=0');

        expect(response.status).toBe(400);
    });
});