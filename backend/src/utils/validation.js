/** Convert a ZodError into the API's [{ field, message }] error list. */
function formatZodIssues(error) {
  return error.issues.flatMap((issue) => {
    const base = issue.path.join('.');
    // Name each rejected field (e.g. "userId") instead of the parent object.
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        field: base ? `${base}.${key}` : key,
        message: `Unknown field "${key}"`,
      }));
    }
    return [{ field: base || 'request', message: issue.message }];
  });
}

module.exports = { formatZodIssues };
