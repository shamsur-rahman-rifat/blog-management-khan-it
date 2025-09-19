// authMiddleware.js
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const token = req.headers['token'];

  jwt.verify(token, 'secret123', (err, decoded) => {
    if (err) {
      return res.status(401).json({ status: 'Unauthorized' });
    }

    req.headers.email = decoded.data;
    next();
  });
};

export default authMiddleware;
