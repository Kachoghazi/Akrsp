const express = require('express');
const router = express.Router();
const { requireStudent,requireStudentOrAdmin } = require('../middleware/role');
const TestResult = require('../models/typing');
const User = require('../models/siginup');
const Profile = require('../models/profile');
const Student = require('../models/Student');
const moment = require('moment');

// Middleware to check if the user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.user) {
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }
  next();
};

// Typing Test Page Route (GET)
router.get('/typing', isLoggedIn, requireStudent, async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.user.username });
    const { user } = req;
    const currentUser = await Student.findOne({ user: user._id });
 

    const currentUserResults = await TestResult.findOne({ user: user._id });
    res.render('typing.ejs', { currentUserResults,profile ,user});
  } catch (err) {
    console.error("Error fetching typing test page:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Handle Test Completion (POST)
router.post('/typing', isLoggedIn, async (req, res) => {
  try {
    const { timeLeft, speed, acc } = req.body;
    // const user = req.user;

    const savedTest = new TestResult({
      // user: user._id,
      time: timeLeft,
      speed,
      accuracy: acc,
    });
    console.log(savedTest);
 
    await savedTest.save();
    console.log(savedTest);
    res.status(200).json({ message: 'Test completed successfully!' });
  } catch (err) {
    console.error("Error saving test result:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Typing Test Results Route (GET)
router.get('/typingresults', isLoggedIn,requireStudentOrAdmin, async (req, res) => {
  try {
    const { user } = req;
    const profile = await Profile.findOne({ username: user.username });

    const studentResults = await TestResult.find({ user: user._id })
      .populate('user', 'username email');

    res.render('typingresults.ejs', {
      results: studentResults,
      profile,
      user,
    });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
