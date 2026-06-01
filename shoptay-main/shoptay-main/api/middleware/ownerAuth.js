const { authRequired } = require('./authMiddleware');
const { isOwnerOrAdminPayload } = require('../utils/ownerAccess');

const requireOwnerOrAdmin = (req, res, next) => authRequired(req, res, () => {
    if (!isOwnerOrAdminPayload(req.user)) {
        return res.status(403).json({ error: 'Forbidden', message: 'Forbidden' });
    }
    return next();
});

module.exports = {
    requireOwnerOrAdmin
};
