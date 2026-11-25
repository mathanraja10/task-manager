/** Consistent success envelope: { success: true, data, ...extra }. */
function sendSuccess(res, data, { status = 200, ...extra } = {}) {
  return res.status(status).json({ success: true, data, ...extra });
}

module.exports = { sendSuccess };
