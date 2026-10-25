import * as authService from '../services/auth.service.js';
import { clearSessionCookie, setSessionCookie, signToken } from '../utils/session.js';

function startSession(res, user, remember) {
  setSessionCookie(res, signToken(user.id, remember), remember);
}

export async function register(req, res) {
  const user = await authService.registerUser(req.valid.body);
  startSession(res, user, false);
  res.status(201).json({ data: { user } });
}

export async function login(req, res) {
  const user = await authService.loginUser(req.valid.body);
  startSession(res, user, req.valid.body.remember);
  res.json({ data: { user } });
}

export function logout(req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ data: { user: req.user } });
}
