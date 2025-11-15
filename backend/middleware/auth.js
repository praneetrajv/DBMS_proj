export const sessions = {};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    const userId = sessions[token];
    if (userId) {
      req.currentUserId = userId;
      return next();
    }
  }
  return res.status(401).json({
    message: "Authentication required. Please log in.",
    expired: true,
  });
};
