const express = require('express');
const router = express.Router();
const Question = require('../models/Questions');
const { requireTeacher,requireAdminOrTeacher } = require('../middleware/role');
const ensureAuthenticated = require("../middleware/authMiddleware.js");
const Profile = require("../models/profile");
const Student = require("../models/Student");

// Helper function to escape special characters in a regular expression
function escapeRegExp(string) {
  return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); // Escape special regex characters
}

// Helper function to normalize language names
function normalizeLanguage(language) {
  if (language === 'C++') {
    return 'cpp'; // Normalize C++ to cpp
  }
  return language; // Ensure all languages are lowercase
}

// Route to render the page to add a new question (only for teachers)
router.get('/add-question', ensureAuthenticated, async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.user.username });
    res.render('Question', {
      layout: 'layouts/biloperets',
      profile,
      user: req.user,
      question: null, // Pass null for adding a new question
    });
  } catch (error) {
    req.flash('error', 'Could not retrieve your profile.');
    res.redirect('/dashboard');
  }
});

// Route to add a new question (POST)
router.post('/add-question', ensureAuthenticated, async (req, res) => {
  const { questionText, dueDate, timerDuration, marks, language } = req.body;
  const teacherId = req.user._id;

  if (!teacherId) {
    return res.status(400).json({ message: 'Teacher ID is required.' });
  }

  try {
    const newQuestion = new Question({
      text: questionText,
      dueDate: new Date(dueDate),
      timerDuration,
      marks,
      language: normalizeLanguage(language), // Normalize language here
      teacherId,
      createdAt: Date.now(),
    });

    await newQuestion.save();
    return res.redirect('/view-questions');
  } catch (err) {
    console.error('Error adding question:', err);
    res.status(500).json({ message: `Error adding question: ${err.message}` });
  }
});

// Route to fetch questions based on the student's language preference
// Route to fetch questions and student details
router.get('/view-questions', ensureAuthenticated, async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.user.username });
    const userRole = req.user.role;

    let questions = [];
    let takenExams = []; // This will hold the questions the student has already taken

    if (userRole === 'admin') {
      // Admin sees all questions
      questions = await Question.find().populate('teacherId', 'name email');
    } else {
      const student = await Student.findOne({ user: req.user._id });

      if (!student) {
        req.flash('error', 'Student not found.');
        return res.redirect('/dashboard');
      }

      // Get the list of questions the student has already taken
      takenExams = student.takenExams;

      // Safely get the language preference, fallback to default
      let preferredLanguage = student.languagePreference || 'defaultLanguage'; 
      preferredLanguage = normalizeLanguage(preferredLanguage);

      // Escape the language to prevent issues in regular expression
      const escapedLanguage = escapeRegExp(preferredLanguage);

      // Fetch questions matching the student's normalized language preference
      questions = await Question.find({
        language: { $regex: new RegExp(`^${escapedLanguage}$`, 'i') } // Case-insensitive match
      }).populate('teacherId', 'name email');
    }

    res.render('viewQuestions', {
      layout: 'layouts/biloperets',
      user: req.user,
      profile,
      questions,
      takenExams, // Pass takenExams to the view
    });
  } catch (error) {
    console.log('Error:', error);
    req.flash('error', 'Could not retrieve questions.');
    res.redirect('/dashboard');
  }
});


// Route to edit a question (GET - Pre-fill the form)
router.get('/edit-question/:id', requireAdminOrTeacher, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      req.flash('error', 'Question not found.');
      return res.redirect('/view-questions');
    }
    const profile = await Profile.findOne({ username: req.user.username });
    res.render('Question', {
      layout: 'layouts/biloperets',
      profile,
      user: req.user,
      question, // Pass the question object to EJS
    });
  } catch (error) {
    req.flash('error', 'Error retrieving question.');
    res.redirect('/view-questions');
  }
});

// Route to update a question (POST)
router.post('/edit-question/:id', requireTeacher, async (req, res) => {
  try {
    const { questionText, dueDate, timerDuration, marks, language } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        text: questionText,
        dueDate: new Date(dueDate),
        timerDuration,
        marks,
        language: normalizeLanguage(language), // Normalize language when updating
        updatedAt: Date.now(), // Update timestamp
      },
      { new: true }
    );

    res.redirect('/view-questions');
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question.' });
  }
});

// Route to edit a question (GET - Pre-fill the form)
router.get('/edit-question/:id', requireTeacher, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      req.flash('error', 'Question not found.');
      return res.redirect('/view-questions');
    }
    const profile = await Profile.findOne({ username: req.user.username });
    res.render('Question', {
      layout: 'layouts/biloperets',
      profile,
      user: req.user,
      question,  // Ensure 'question' is passed to the view
    });
  } catch (error) {
    req.flash('error', 'Error retrieving question.');
    res.redirect('/view-questions');
  }
});

module.exports = router;
