const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message, statusCode = 400, errorCode = 'BAD_REQUEST') => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
  });
};

module.exports = { sendSuccess, sendError };
