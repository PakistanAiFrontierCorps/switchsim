function notFoundHandler(request, response) {
  if (request.path.startsWith("/api/")) {
    return response.status(404).json({ error: "Route not found" });
  }

  return response.status(404).send("Not found");
}

function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;
  const details = error.details || null;

  response.status(statusCode).json({
    error: error.message || "Internal server error",
    details
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
