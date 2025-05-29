const express = require("express");
const router = express.Router();
const Teacher = require("../models/Teacher");
const User = require("../models/siginup");
const Profile = require("../models/profile");

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (!req.user) {
        req.flash("error", "Please log in to continue.");
        return res.redirect("/login");
    }
    next();
};

// Render add teacher form
router.get("/add-teacher", isLoggedIn, async (req, res) => {
    const profile = await Profile.findOne({ username: req.user.username });
    res.render("admin/admin.ejs", {
        layout: "layouts/biloperets",
        profile,
        user: req.user,
    });
});

// Add a new teacher
router.post("/add-teacher", isLoggedIn, async (req, res) => {
    const { firstName, middleName, lastName, fatherName, motherName, email, mobileNo, password, address } = req.body;

    if (password !== req.body.passwordVerify) {
        req.flash("error", "Passwords do not match.");
        return res.redirect("/add-teacher");
    }

    try {
        const user = new User({ email, username: email.split('@')[0], role: "teacher" });
        await User.register(user, password);

        const teacher = new Teacher({
            user: user._id, 
            firstName,
            middleName,
            lastName,
            fatherName,
            motherName,
            mobileNo,
            address,
        });
        await teacher.save();

        req.flash("success", "Teacher added successfully!");
        res.redirect("/add-teacher");
    } catch (error) {
        req.flash("error", error.message);
        res.redirect("/add-teacher");
    }
});

// Get list of teachers
router.get("/teachers", isLoggedIn, async (req, res) => {
    try {
        const teachers = await Teacher.find().populate('user');
        const profile = await Profile.findOne({ username: req.user.username });

        res.render("admin/teacher.ejs", {
            layout: "layouts/biloperets",
            profile,
            teachers,
            user: req.user,
        });
    } catch (error) {
        req.flash("error", "Could not retrieve teachers.");
        res.redirect("/add-teacher");
    }
});

// Get edit teacher page
router.get("/edit-teacher/:id", isLoggedIn, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id).populate('user');
        const profile = await Profile.findOne({ username: req.user.username });
        
        res.render("admin/edit-teacher.ejs", {
            layout: "layouts/biloperets",
            profile,
            teacher,
            user: req.user,
        });
    } catch (error) {
        req.flash("error", "Could not retrieve teacher for editing.");
        res.redirect("/teachers");
    }
});

// Update teacher details
router.post("/edit-teacher/:id", isLoggedIn, async (req, res) => {
    const { firstName, middleName, lastName, fatherName, motherName, mobileNo, address } = req.body;

    try {
        await Teacher.findByIdAndUpdate(req.params.id, {
            firstName,
            middleName,
            lastName,
            fatherName,
            motherName,
            mobileNo,
            address,
        });

        req.flash("success", "Teacher details updated successfully!");
        res.redirect("/teachers");
    } catch (error) {
        req.flash("error", "Could not update teacher details.");
        res.redirect(`/edit-teacher/${req.params.id}`);
    }
});

// Delete a teacher
router.post("/delete-teacher/:id", isLoggedIn, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        await User.findByIdAndDelete(teacher.user);
        await Teacher.findByIdAndDelete(req.params.id);
        
        req.flash("success", "Teacher deleted successfully!");
        res.redirect("/teachers");
    } catch (error) {
        req.flash("error", "Could not delete teacher.");
        res.redirect("/teachers");
    }
});

module.exports = router;
