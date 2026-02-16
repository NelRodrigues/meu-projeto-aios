/**
 * Utility functions for API responses
 */

export function sendJSON(res, data, statusCode = 200) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (statusCode === 204) {
    res.status(statusCode).end();
  } else {
    res.status(statusCode).json(data);
  }
}

export function sendError(res, statusCode, message, details = null) {
  const error = { error: message };
  if (details && process.env.NODE_ENV === 'development') {
    error.details = details;
  }
  return sendJSON(res, error, statusCode);
}

export function sendSuccess(res, data = null) {
  return sendJSON(res, {
    success: true,
    data: data || {}
  });
}
