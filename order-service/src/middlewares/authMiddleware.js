const { authClient } = require('../grpc/grpcClients');

const protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return res.status(401).json({ success: false, error: 'Not authorized to access this route' });

  authClient.ValidateToken({ token }, (err, response) => {
    if (err || !response.valid) {
      return res.status(401).json({ success: false, error: response?.error || 'Not authorized' });
    }
    req.user = { id: response.userId };
    next();
  });
};

module.exports = { protect };
