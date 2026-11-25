const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

async function register(req, res) {
  const result = await authService.register(req.validated.body);
  sendSuccess(res, result, { status: 201 });
}

async function login(req, res) {
  const result = await authService.login(req.validated.body);
  sendSuccess(res, result);
}

async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, user);
}

module.exports = { register, login, me };
