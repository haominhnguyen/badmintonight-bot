const request = require('supertest');
const app = require('../../src/api-server');

describe('Sessions API', () => {
  let authToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: '12345' });
    
    authToken = loginResponse.body.data.token;
  });

  describe('GET /api/v1/sessions', () => {
    it('should get sessions list', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/sessions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/v1/sessions?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(session => {
        expect(session.status).toBe('pending');
      });
    });
  });

  describe('GET /api/v1/sessions/:id', () => {
    let sessionId;

    beforeAll(async () => {
      // Create a test session first
      const createResponse = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-31' });
      
      sessionId = createResponse.body.data.id;
    });

    it('should get session by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(sessionId);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid session ID', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/sessions', () => {
    it('should create new session', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-25' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.date).toBe('2024-12-25');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: 'invalid-date' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing date', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent creating duplicate active sessions', async () => {
      // Create first session
      await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-26' });

      // Try to create another active session
      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-27' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active session');
    });
  });

  describe('PUT /api/v1/admin/sessions/:id/court', () => {
    let sessionId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-28' });
      
      sessionId = createResponse.body.data.id;
    });

    it('should update court count', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/court`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.courtCount).toBe(3);
    });

    it('should reject invalid court count', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/court`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 15 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject negative court count', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/court`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/sessions/:id/shuttle', () => {
    let sessionId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-29' });
      
      sessionId = createResponse.body.data.id;
    });

    it('should update shuttle count', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/shuttle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shuttleCount).toBe(5);
    });

    it('should reject invalid shuttle count', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/shuttle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 100 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/sessions/:id/calculate', () => {
    let sessionId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '2024-12-30' });
      
      sessionId = createResponse.body.data.id;

      // Set court and shuttle counts
      await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/court`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 2 });

      await request(app)
        .put(`/api/v1/admin/sessions/${sessionId}/shuttle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 3 });
    });

    it('should calculate session costs', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/sessions/${sessionId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCost).toBeDefined();
      expect(response.body.data.participantCount).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should sanitize input data', async () => {
      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ date: '<script>alert("xss")</script>2024-12-31' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/v1/sessions?status=1; DROP TABLE sessions; --')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
