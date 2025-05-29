// middlewares/authMiddleware.js

const ensureAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "User authentication is required.");
        return res.redirect("/login");
    }
    next();
};

module.exports = ensureAuthenticated;
