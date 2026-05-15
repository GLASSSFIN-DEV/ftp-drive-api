import { describe, it, expect } from 'vitest';
import app from '../../src/index'

describe('Google OAuth', () => {
  it('Handshake login', async () => {
    const res = await app.request('/v1/oauth/google')

    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.ok).toBe(true);
  });
});