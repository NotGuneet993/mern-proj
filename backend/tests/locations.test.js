const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('GET /locations/getLocation', () => {
  it('should return 200 and an array', async () => {
    const res = await request(app).get('/locations/getLocation');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain("Business Administration I");
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});