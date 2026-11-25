/** Human-readable message from an Axios error (API envelope, network, or unknown). */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (error?.request && !error.response) return 'Cannot reach the server. Is the API running?';
  return fallback;
}

/** Map the API's [{ field, message }] validation errors to { field: message }. */
export function getFieldErrors(error) {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  return list.reduce((acc, { field, message }) => {
    if (!acc[field]) acc[field] = message;
    return acc;
  }, {});
}
