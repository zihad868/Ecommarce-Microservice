const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../../protos/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const authClient = new authProto.AuthService(
  process.env.AUTH_GRPC_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

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
