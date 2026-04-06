const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const { execSync } = require('child_process');
const { connectRedis, getClient } = require('../src/config/redis');

jest.setTimeout(30000); // Reset to 30s as Docker should be fast

describe('API Integration Test Suite', () => {
    let token;
    let projectId;
    let taskId;
    const MONGO_Container_NAME = 'mongo-integration-test';
    const MONGO_PORT = 27018;

    beforeAll(async () => {
        console.log('--- TEST SETUP START ---');

        // 1. Start Docker Container
        try {
            console.log('Starting Docker Mongo Container...');
            // Cleanup just in case
            try { execSync(`docker rm -f ${MONGO_Container_NAME}`); } catch (e) { /* ignore */ }

            execSync(`docker run -d -p ${MONGO_PORT}:27017 --name ${MONGO_Container_NAME} mongo:latest`);
            try { execSync(`docker rm -f redis-integration-test`); } catch (e) { /* ignore */ }
            execSync(`docker run -d -p 6380:6379 --name redis-integration-test redis:latest`);
            console.log('Docker Container Started. Waiting for DB to be ready...');

            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (err) {
            console.error('Docker Setup Failed:', err.message);
            throw new Error('Docker Setup Failed');
        }

        // 2. Connect Mongoose
        const uri = `mongodb://localhost:${MONGO_PORT}/test-db`;
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        await mongoose.connect(uri);
        console.log('--- CONNECTED TO DOCKER TEST DB ---');

        // 3. Connect Redis
        process.env.REDIS_URL = 'redis://localhost:6380';
        await connectRedis();
        const client = getClient();
        if (!client || !client.isOpen) {
            console.error('Redis failing to connect in test setup');
            throw new Error('Redis Connection Failed');
        }
        console.log('--- CONNECTED TO DOCKER TEST REDIS ---');

        // 3. Register a test user
        const userData = {
            name: 'Integration Tester',
            email: `test_${Date.now()}@example.com`,
            password: 'password123'
        };

        try {
            const res = await request(app)
                .post('/api/auth/register')
                .send(userData);

            if (!res.body.success) {
                console.error('Registration failed:', res.body);
                throw new Error('Registration failed');
            }
            token = res.body.data.accessToken;
            console.log('--- TEST SETUP SUCCESS: Token Acquired ---');
        } catch (err) {
            console.error('--- TEST SETUP ERROR ---', err.message);
            throw err;
        }
    });

    afterAll(async () => {
        console.log('--- TEST TEARDOWN START ---');
        await mongoose.disconnect();

        const redisClient = getClient();
        if (redisClient && redisClient.isOpen) await redisClient.quit();

        try {
            execSync(`docker rm -f ${MONGO_Container_NAME}`);
            execSync(`docker rm -f redis-integration-test`);
            console.log('Docker Containers Removed.');
        } catch (err) {
            console.error('Failed to remove docker containers:', err.message);
        }
        console.log('--- TEST DATABASE STOPPED ---');
    });

    describe('System Endpoints', () => {
        it('GET /health - should return 200 and ok status', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('Auth Endpoints', () => {
        const testUser = {
            name: 'Auth Tester',
            email: `auth_${Date.now()}@example.com`,
            password: 'password123'
        };

        it('POST /api/auth/register - should register a new user and ignore extra fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    role: 'admin', // EXTRA FIELD: Should be ignored by matchedData
                    malicious: true
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.email).toBe(testUser.email);
            expect(res.body.data.role).toBe('user'); // Verify matchedData worked (role: 'admin' was ignored, so default 'user' was used)
        });

        it('POST /api/auth/register - should fail with invalid data', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: '',
                    email: 'invalid-email',
                    password: '123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/auth/login - should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                    extra: 'junk' // EXTRA FIELD: Should be ignored
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.accessToken).toBeDefined();
        });

        it('POST /api/auth/login - should fail with wrong credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Project Endpoints', () => {
        it('POST /api/projects - should create a project', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Project',
                    description: 'Integration test project'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            projectId = res.body.data._id;
        });

        it('GET /api/projects - should list projects', async () => {
            const res = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.some(p => p._id === projectId)).toBe(true);
        });

        it('GET /api/projects/:id - should get project details', async () => {
            const res = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.name).toBe('Test Project');
        });

        it('PUT /api/projects/:id - should update project', async () => {
            const res = await request(app)
                .put(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'completed' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.status).toBe('completed');
        });
    });

    describe('Task Endpoints', () => {
        it('POST /api/projects/:pid/tasks - should create a task and auto-add assignee to project members', async () => {
            // Create a new user to assign task to
            const assigneeRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Task Assignee',
                    email: `assignee_${Date.now()}@example.com`,
                    password: 'password123'
                });
            const assigneeId = assigneeRes.body.data._id;

            const res = await request(app)
                .post(`/api/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Test Task',
                    description: 'Task description',
                    assignedTo: [assigneeId]
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.assignedTo).toContain(assigneeId);
            taskId = res.body.data._id;

            // VERIFY AUTO-MEMBERSHIP
            const projectRes = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${token}`);

            // The members array should now contain the assigneeId
            const members = projectRes.body.data.members.map(m => m._id);
            expect(members).toContain(assigneeId);
        });

        it('POST /api/projects/:pid/tasks - should FAIL if assignedTo is a string (Strict Validation)', async () => {
            // Create another user
            const userRes = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Single Assignee',
                    email: `single_${Date.now()}@example.com`,
                    password: 'password123'
                });
            const singleUserId = userRes.body.data._id;

            const res = await request(app)
                .post(`/api/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Strict Task',
                    description: 'Testing string assignment rejection',
                    assignedTo: singleUserId
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors[0].msg).toBe('assignedTo must be an array of User IDs');
        });

        it('GET /api/projects/:pid/tasks - should list tasks', async () => {
            const res = await request(app)
                .get(`/api/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.some(t => t._id === taskId)).toBe(true);
        });

        it('GET /api/projects/:pid/tasks/stats - should get task statistics', async () => {
            const res = await request(app)
                .get(`/api/projects/${projectId}/tasks/stats`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('stats');
        });

        it('PUT /api/projects/:pid/tasks/:id - should update task', async () => {
            const res = await request(app)
                .put(`/api/projects/${projectId}/tasks/${taskId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'in-progress' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.status).toBe('in-progress');
        });

        it('DELETE /api/projects/:pid/tasks/:id - should delete task', async () => {
            const res = await request(app)
                .delete(`/api/projects/${projectId}/tasks/${taskId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);

            // Verify deletion
            const check = await request(app)
                .get(`/api/projects/${projectId}/tasks`)
                .set('Authorization', `Bearer ${token}`);
            expect(check.body.data.some(t => t._id === taskId)).toBe(false);
        });

        it('DELETE /api/projects/:id - should delete project and cascade delete tasks', async () => {
            const res = await request(app)
                .delete(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);

            // Verify Project deletion
            const checkProject = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(checkProject.statusCode).toBe(404);

            // Verify Cascading Task deletion
            const checkTask = await request(app)
                .get(`/api/projects/${projectId}/tasks/${taskId}`)
                .set('Authorization', `Bearer ${token}`);

            // Should return 404 because task is gone
            expect(checkTask.statusCode).toBe(404);
        });
    });

    describe('Error Context Verification', () => {
        it('should return 404 Task not found for non-existent valid Task ID', async () => {
            const randomProjectId = new mongoose.Types.ObjectId();
            const randomTaskId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .put(`/api/projects/${randomProjectId}/tasks/${randomTaskId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'completed' });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Task not found');
        });

        it('should return 404 Project not found for non-existent Project during task creation', async () => {
            const randomProjectId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post(`/api/projects/${randomProjectId}/tasks`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Ghost Task', description: 'Should fail' });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Project not found');
        });
    });
});
