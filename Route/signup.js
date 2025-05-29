const express = require("express");
const passport = require("passport");
const User = require("../models/siginup");
const router = express.Router();
const Profile = require("../models/profile");
const flash = require("connect-flash");

// Signup
router.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash("error", "User already exists");
            return res.redirect("/signup");
        }
        const newUser = new User({ username, email });
        await User.register(newUser, password);
        req.flash("success", "Successfully registered! Please log in.");
        res.redirect("/login");
    } catch (e) {
        console.error("Signup Error:", e);
        req.flash("error", e.message);
        res.redirect("/signup");
    }
});

// Login
router.get("/login", (req, res) => {
    res.render("login.ejs");
});

router.post("/login", async (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash("error", "Invalid email or password.");
            return res.redirect("/login");
        }
        req.logIn(user, async (err) => {
            if (err) return next(err);

            // Fetch the user's profile
            const profile = await Profile.findOne({ username: user.username });
            if (profile) {
                req.session.username = profile.username; // Store username in session
            }

            req.flash("success", "Welcome back to Wonderfuland.");
            if (user.role === "teacher") {
                return res.redirect("/teacher-dashboard");
            } else if (user.role === "admin") {
                return res.redirect("/admin-dashboard");
            } else if (user.role === "student") {
                return res.redirect("/student-dashboard");
            }
        });
    })(req, res, next);
});

// Logout
router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Logout Error:", err);
            return next(err);
        }
        req.flash("success", "You have been logged out.");
        res.redirect("/login");
    });
});

module.exports = router;
