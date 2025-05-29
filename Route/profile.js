const express = require("express");
const multer = require("multer");
const path = require("path");
const moment = require('moment');

const fs = require("fs");
const Profile = require("../models/profile");
const User = require("../models/siginup");
const ensureAuthenticated = require("../middleware/authMiddleware.js");
const ejs = require("ejs");
const Teacher = require("../models/Teacher.js");
const Student =require("../models/Student.js");
const CodeSubmission=require("../models/code.js");
const Question =require("../models/Questions.js");
const TestResult = require('../models/typing'); 
const{ requireStudent,  requireTeacher, requireAdmin,requireRole}=require("../middleware/role.js")
const router = express.Router();

// Ensure the "uploads" directory exists
const uploadDir = path.join(__dirname, "..", "uploads");
console.log('Upload directory path:', uploadDir);  // Log the upload path
if (!fs.existsSync(uploadDir)) {
  console.log("Creating uploads directory...");
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Uploads directory created.");
} else {
  console.log("Uploads directory exists.");
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Trying to upload to:", uploadDir);  // Log the directory
    if (!fs.existsSync(uploadDir)) {
      console.log("Uploads directory does not exist!");
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname); // Unique file name
    console.log("Uploading file:", filename);  // Log the file name
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Profile Routes
// Get profile page
router.get("/profile", ensureAuthenticated, async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.user.username });
    const student = await Student.findOne({ languagePreference: req.user?.languagePreference ?? null });
        console.log(student);
    res.render("profile", {
      profile,
      user: req.user,
      student,
      layout: "layouts/biloperets",
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    req.flash("error", "An error occurred while fetching your profile.");
    res.redirect("/login");
  }
});

// Handle profile form submission
router.post("/profile", upload.single("profile-pic"), ensureAuthenticated, async (req, res) => {
  const { name, username, fatherName, gender, phone } = req.body;
  const profilePic = req.file ? req.file.filename : "default.jpg";

  try {
    console.log("Received data:", { name, username, fatherName, gender, phone, profilePic });

    const existingProfile = await Profile.findOne({ username });
    if (existingProfile && existingProfile.username !== req.user.username) {
      req.flash("error", "Username is already taken.");
      return res.redirect("/profile");
    }

    let profile = await Profile.findOne({ username: req.user.username });
    if (profile) {
      // Update existing profile
      Object.assign(profile, { name, fatherName, gender, phone, profilePic, username });
    } else {
      // Create new profile if not found
      profile = new Profile({ name, username, fatherName, gender, phone, profilePic });
    }

    await profile.save();
    await User.updateOne({ _id: req.user._id }, { username });
    req.user.username = username; // Update user session username
    req.session.username = username; // Ensure session is updated

    req.flash("success", "Profile updated successfully!");
    res.redirect(`/profile/${username}`);
  } catch (error) {
    console.error("Error saving profile data:", error);
    req.flash("error", "Error saving profile data: " + error.message);
    res.redirect("/profile");
  }
});

// Dashboard Route
// router.get("/dashboard", async (req, res) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect("/login");
//   }

//   try {
//     const profile = await Profile.findOne({ username: req.session.username });
    
//     res.render("layouts/biloperets", {
//       profile,
//       user: req.user,
    
//     });
//   } catch (error) {
//     console.error("Error fetching profile:", error);
//     req.flash("error", "An error occurred while fetching your profile.");
//     res.redirect("/login");
//   }
// });


// Other imports and middleware...

// Define the checkTestResult function
function checkTestResult(submission) {
  // Example: Check if the code contains 'fibonacci' keyword as an indication of passing
  return submission.code.includes('fibonacci');
}

// Define the calculateScore function
function calculateScore(submission) {
  const lineCount = submission.code.split('\n').length;
  const maxMarks = submission.questionId.marks;  // Check if questionId is not null
  return Math.min(lineCount, maxMarks); // Ensure the score doesn't exceed the maximum marks
}

// routes/admin.js
router.get("/admin-dashboard", async (req, res) => {
  if (!req.user) {
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }

  try {
    console.log("Fetching dashboard data...");
   
    // Fetch teacher and student counts
    const teacherCount = await Teacher.countDocuments();
    const studentCount = await Student.countDocuments();
    console.log(`Teacher Count: ${teacherCount}, Student Count: ${studentCount}`);

    // Get the profile of the logged-in user
    const profile = await Profile.findOne({ username: req.user.username });
    const student = await Student.findOne({ languagePreference: req.user?.languagePreference ?? null });

    console.log("Profile fetched:", profile);

    // Get today's date using moment
    const today = moment().startOf('day').toDate();

    // Fetch upcoming tests (tests that are due after today)
    const upcomingTests = await Question.find({ dueDate: { $gt: today } }).sort({ dueDate: 1 });
    console.log("Upcoming Tests:", upcomingTests);

    // Fetch today's tests (tests that are due today)
    const todayTests = await Question.find({ dueDate: { $eq: today } }).sort({ dueDate: 1 });
    console.log("Today's Tests:", todayTests);

    // Fetch active tests (tests that are currently active, with due dates after today)
    const activeTests = await Question.find({ dueDate: { $gt: today } }).sort({ dueDate: 1 });
    console.log("Active Tests:", activeTests);

    // Fetch all code submissions to determine passed/failed results
    const submissions = await CodeSubmission.find().populate('questionId userId');
    console.log("Submissions:", submissions);

    const results = submissions.map(submission => {
      const passed = checkTestResult(submission);
      const marks = submission.questionId ? calculateScore(submission) : 0;
      const username = submission.userId? submission.userId.username : 'Unknown';
      return {
        student: username,
        testTitle: submission.questionId ? submission.questionId.text : 'No Title',
        marks,
        status: passed ? 'Passed' : 'Failed',
      };
    });
    // Fetch Typing Test Results for Admin
    const typingResults = await TestResult.find().populate('user', 'username email').sort({ createdAt: -1 });
    console.log("Typing Results:", typingResults);

    // Count the number of active students in coding tests
    const activeTestCount = await Student.countDocuments();

    // Render the admin dashboard with the typing results
    res.render("admin-dashboard.ejs", {
      layout: "layouts/biloperets",
      teacherCount,
      studentCount,
      user: req.user,
      upcomingTests,  // Now defined
      todayTests,     // Now defined
      activeTests,
      activeTestCount,
      results,
      student,        // Code Results
      typingResults,  // Typing Results
      profile
    });

  } catch (error) {
    console.error("Error occurred:", error); // Log the actual error
    req.flash("error", "Could not retrieve dashboard data.");
    res.redirect("/login");
  }
});








// View Profile by username
router.get("/profile/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const profile = await Profile.findOne({ username });
    console.log(profile); // Log the retrieved profile
    if (!profile) {
      req.flash("error", "Profile not found.");
      return res.redirect("/profile");
    }

    res.render("view", {
      profile,
      user: req.user,
      layout: "layouts/biloperets",
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    req.flash("error", "An error occurred while fetching the profile.");
    res.redirect("/profile");
  }
});

module.exports = router;
