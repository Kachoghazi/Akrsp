// middleware/authorize.js
function authorize(roles = []) {
    // If roles is a single role, make it an array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            return res.redirect('/login'); // Redirect to login if not authenticated
        }

        // Check if user has the required role
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).send('Access denied'); // Forbidden
        }

        next(); // User is authorized, proceed to the next middleware
    };
}

module.exports = authorize;
