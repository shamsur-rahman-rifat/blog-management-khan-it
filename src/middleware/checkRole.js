// middleware/checkRole.js
import userModel from '../model/User.js';

const checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const email = req.headers['email'];

      const user = await userModel.findOne({ email });

      if (!user) {
        return res.status(404).json({ status: 'Failed', message: 'User not found' });
      }

      const userRoles = user.roles || [];

      const hasRole = userRoles.some(role => allowedRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ status: 'Failed', message: 'Forbidden: You do not have permission' });
      }

      req.userRoles = userRoles;
      next();
    } catch (error) {
      res.status(500).json({ status: 'Failed', message: error.message });
    }
  };
};

export default checkRole;
