const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const User = require("../models/siginup");
const Profile = require("../models/profile");
const { requireTeacher } = require("../middleware/role.js");

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (!req.user) {
        req.flash("error", "Please log in to continue.");
        return res.redirect("/login");
    }
    next();
};

// Render add student form
router.get("/add-student", isLoggedIn, async (req, res) => {
    const profile = await Profile.findOne({ username: req.user.username });
    res.render("student.ejs", {
        layout: "layouts/biloperets",
        profile,
        user: req.user,
    });
});

// Add a new student
router.post("/add-student", isLoggedIn, async (req, res) => {
    const {
        firstName,
        lastName,
        collegeName,
        collegeCity,
        fatherName,
        motherName,
        email,
        mobileNo,
        state,
        city,
        address,
        password,
        selectionOption,
        languagePreference,
        typingSpeed,  // Capture typing speed if typing is selected
    } = req.body;

    // Log the incoming request data to check if the form is submitted correctly
    console.log("Received form data:", req.body);

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash("error", "A user with this email already exists.");
            return res.redirect("/add-student");
        }

        // Create a new user (this is your student user)
        const user = new User({
            email,
            username: email.split('@')[0],
            role: "student"
        });
        
        // Use register method from passport-local-mongoose to create a user
        try {
            await User.register(user, password); // Register the user in the system
            console.log("New user created:", user);  // Log the user object after creation
        } catch (err) {
            console.error("Error during user registration:", err);  // Log any error during registration
            req.flash("error", "User registration failed: " + err.message);
            return res.redirect("/add-student");
        }

        // Prepare student data for saving
        const studentData = {
            user: user._id,
            firstName,
            lastName,
            collegeName,
            collegeCity,
            fatherName,
            motherName,
            mobileNo,
            state,
            city,
            address,
            languagePreference: selectionOption === 'language' ? languagePreference : null,
            typingSpeed: selectionOption === 'typing' ? typingSpeed : null, // Save typing speed if selected
        };

        // Log the student data before saving to check if everything is correct
        console.log("Student data before saving:", studentData);

        const student = new Student(studentData);

        // Log before saving to ensure that the save operation is happening
        console.log("Saving student to the database...");

        try {
            await student.save();  // Save the student to the database
            console.log("Student saved:", student);  // Log the saved student to verify it's added
        } catch (err) {
            console.error("Error saving student:", err);  // Log any errors during student save
            req.flash("error", "Error saving student: " + err.message);
            return res.redirect("/add-student");
        }

        req.flash("success", "Student added successfully!");
        res.redirect("/students");

    } catch (error) {
        console.error("Error during student creation:", error);  // Log any errors to the console
        req.flash("error", "Could not add student: " + error.message);
        res.redirect("/add-student");
    }
});



// Show all students
router.get("/students", isLoggedIn, async (req, res) => {
    try {
        // Fetch students and populate the related 'user' field
        const students = await Student.find().populate('user');
        const profile = await Profile.findOne({ username: req.user.username });
        const student = await Student.findOne({ languagePreference: req.user?.languagePreference ?? null });
        console.log(student);
        res.render("ShowStudent.ejs", {
            layout: "layouts/biloperets",
            profile,
            students,
            student,
            user: req.user,
        });
    } catch (error) {
        req.flash("error", "Could not retrieve students.");
        res.redirect("/add-student");
    }
});

// Get edit student page
router.get("/edit-student/:id", isLoggedIn, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).populate('user');
        const profile = await Profile.findOne({ username: req.user.username });

        res.render("edit-student.ejs", {
            layout: "layouts/biloperets",
            profile,
            student,
            user: req.user,
        });
    } catch (error) {
        req.flash("error", "Could not retrieve student for editing.");
        res.redirect("/students");
    }
});

// Update student details
router.post("/edit-student/:id", isLoggedIn, async (req, res) => {
    const { firstName, lastName, collegeName, collegeCity, fatherName, motherName, mobileNo, state, city, address, languagePreference } = req.body;

    try {
        await Student.findByIdAndUpdate(req.params.id, {
            firstName,
            lastName,
            collegeName,
            collegeCity,
            fatherName,
            motherName,
            mobileNo,
            state,
            city,
            address,
            languagePreference,
        });

        req.flash("success", "Student details updated successfully!");
        res.redirect("/students");
    } catch (error) {
        req.flash("error", "Could not update student details.");
        res.redirect(`/edit-student/${req.params.id}`);
    }
});

// Delete a student
router.post("/delete-student/:id", isLoggedIn, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        await User.findByIdAndDelete(student.user);
        await Student.findByIdAndDelete(req.params.id);
        
        req.flash("success", "Student deleted successfully!");
        res.redirect("/students");
    } catch (error) {
        req.flash("error", "Could not delete student.");
        res.redirect("/students");
    }
});
router.get("/students/:preference", isLoggedIn, async (req, res) => {
    const preference = req.params.preference.toLowerCase();
    try {
        let students;
        if (preference === "typing") {
            students = await Student.find({ languagePreference: null }).populate("user");
        } else if (preference === "language") {
            students = await Student.find({ languagePreference: { $ne: null } }).populate("user");
        } else {
            req.flash("error", "Invalid preference selected.");
            return res.redirect("/students/typing");
        }

        const profile = await Profile.findOne({ username: req.user.username });

        res.render("dashboard.ejs", {
            layout: "layouts/biloperets",
            profile,
            students,
            user: req.user,
            preference: preference === "typing" ? "Typing" : "Language",
        });
    } catch (error) {
        console.error("Error fetching students:", error);
        req.flash("error", "Could not retrieve students.");
        res.redirect("/students/typing");
    }
});
module.exports = router;
