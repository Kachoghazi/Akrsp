const express = require("express");
const User = require("../models/siginup");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Profile = require("../models/profile");

const router = express.Router();


// Change Password
router.get("/changepassword", async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You need to be logged in to change your password.");
        return res.redirect("/login");
    }

    try {
        const profile = await Profile.findOne({ username: req.user.username });

        // Render the change password page with user and profile information
        res.render("user/changepassword.ejs", {
            layout: "layouts/biloperets",
            profile,
            user: req.user,
        });
    } catch (error) {
        console.error("Error rendering change password page:", error);
        req.flash("error", "An error occurred while loading the change password page.");
        res.redirect("/dashboard");
    }
});

router.post("/changepassword", async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        req.flash("error", "New passwords do not match.");
        return res.redirect("/changepassword");
    }

    try {
        const user = await User.findById(req.user._id);
        const isMatch = await user.authenticate(currentPassword);
        if (!isMatch) {
            req.flash("error", "Current password is incorrect.");
            return res.redirect("/changepassword");
        }

        await user.setPassword(newPassword);
        await user.save();

        req.flash("success", "Password changed successfully.");
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Error changing password:", error);
        req.flash("error", "An error occurred. Please try again.");
        res.redirect("/changepassword");
    }
});

// Forgot Password
router.get("/forgot-password", (req, res) => {
    res.render("forget.ejs");
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/forgot-password");
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `http://localhost:8080/reset-password/${resetToken}`;
        const mailOptions = {
            to: email,
            subject: 'Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                  `Please click on the following link to reset your password:\n\n` +
                  `${resetUrl}\n\n` +
                  `If you did not request this, please ignore this email.\n`
        };

        // Set up Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        await transporter.sendMail(mailOptions);
        req.flash("success", "An email has been sent with further instructions.");
        res.redirect("/login");
    } catch (error) {
        console.error("Forgot Password Error:", error);
        req.flash("error", "Error sending email. Please try again.");
        res.redirect("/forgot-password");
    }
});

// Reset Password
router.get("/reset-password/:token", async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot-password");
        }
        res.render("reset-password.ejs", { token: req.params.token });
    } catch (error) {
        console.error("Error during password reset:", error);
        req.flash("error", "An error occurred. Please try again.");
        res.redirect("/forgot-password");
    }
});

// Handle new password submission
router.post("/reset-password/:token", async (req, res) => {
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot-password");
        }

        await user.setPassword(password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.flash("success", "Your password has been successfully reset!");
        res.redirect("/login");
    } catch (error) {
        console.error("Error resetting password:", error);
        req.flash("error", "An error occurred. Please try again.");
        res.redirect("/forgot-password");
    }
});

module.exports = router;
