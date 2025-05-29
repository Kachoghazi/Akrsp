const express = require('express');
const router = express.Router();
const CodeSubmission = require('../models/code');
const User = require("../models/siginup");
const Profile = require("../models/profile");
const { requireAdminOrTeacher, requireStudent,requireStudentOrAdmin } = require('../middleware/role');
const axios = require('axios');

// Function to calculate marks based on execution time and memory usage
function calculateMarks(executionTime, memory) {
  let marks = 10; // Set full marks as 10
  if (executionTime > 500) marks -= 2; // Deduct 2 marks if execution time > 500ms
  if (memory > 500) marks -= 1;       // Deduct 1 mark if memory usage > 500KB
  return Math.max(marks, 0);           // Ensure marks do not go below 0
}

// Route to submit code (Student only)
router.post('/submit-code', requireStudentOrAdmin, async (req, res) => {
  try {
    const { code, language, questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: 'Question ID is required.' });
    }

    // Make a request to JDoodle to execute the code
    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      script: code,
      language: language,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    // Extract data from the JDoodle response
    const { output, executionTime, memory } = response.data;

    // Calculate marks based on execution time and memory
    const marks = calculateMarks(executionTime, memory);

    // Create a new submission object to save to the database
    const newSubmission = new CodeSubmission({
      code,
      language,
      questionId,
      marks,
      userId: req.user._id,
      submittedAt: new Date(),
    });

    // Save the submission to the database
    await newSubmission.save();
    res.redirect('/student-dashboard');
    // Send the response back to the client
    res.status(200).json({
      message: 'Code submitted successfully!',
      submission: newSubmission,
      output: output || 'No output returned',  // Ensure output is always defined
      executionTime,
      memory,
      marks,
    });

  } catch (error) {
    console.error('Error saving code submission:', error);
    res.status(500).send('Server error');
  }
});

// Route to view submissions
// Admin/Teacher can view all submissions, but students only see their own submissions
router.get('/view-submissions', async (req, res) => {
  try {
    let submissions;

    // For admins/teachers, fetch all submissions
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      submissions = await CodeSubmission.find().populate('userId', 'username');
    } else {
      // For students, fetch only their own submissions
      submissions = await CodeSubmission.find({ userId: req.user._id }).populate('userId', 'username');
    }

    const profile = await Profile.findOne({ username: req.user.username });
    res.render('Output.ejs', { submissions, profile, user: req.user });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).send('Server error');
  }
});

// Route to show the form for updating marks (Admin/Teacher only)
router.get('/edit-submission/:submissionId', requireAdminOrTeacher, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await CodeSubmission.findById(submissionId).populate('userId', 'username');
    const profile = await Profile.findOne({ username: req.user.username });

    if (!submission) {
      req.flash('error', 'Submission not found');
      return res.redirect('/view-submissions');
    }

    // Pass the data together in one object
    res.render('edit-marks.ejs', { submission, user: req.user, profile });
  } catch (err) {
    console.error('Error fetching submission:', err);
    res.status(500).send('Server error');
  }
});

// Route to handle updating the marks for a code submission
router.post('/edit-submission/:submissionId', requireAdminOrTeacher, async (req, res) => {
  const { submissionId } = req.params;
  const { marks } = req.body; // Marks entered by admin/teacher

  try {
    const submission = await CodeSubmission.findById(submissionId);

    if (!submission) {
      req.flash('error', 'Submission not found');
      return res.redirect('/view-submissions');
    }

    // Update the marks for the submission
    submission.marks = marks;

    // Save the updated submission
    await submission.save();

    // Notify the student about the updated result
    const student = await User.findById(submission.userId);
    req.flash('success', `Marks updated successfully. The student, ${student.username}, has been notified.`);

    // Redirect to view submissions
    res.redirect('/view-submissions');
  } catch (err) {
    console.error('Error updating marks:', err);
    req.flash('error', 'Error updating marks.');
    res.redirect('/view-submissions');
  }
});

// Route to delete a submission (Admin/Teacher only)
router.post('/delete-submission/:submissionId', requireAdminOrTeacher, async (req, res) => {
  const { submissionId } = req.params;

  try {
    // Find and delete the submission by ID
    const submission = await CodeSubmission.findByIdAndDelete(submissionId);

    if (!submission) {
      // If no submission found, return a 404 error
      req.flash('error', 'Submission not found.');
      return res.redirect('/view-submissions'); // Redirect back to the submissions page
    }

    // If the submission is deleted successfully
    req.flash('success', 'Submission deleted successfully.');
    res.redirect('/view-submissions'); // Redirect back to the submissions page after deletion
  } catch (err) {
    console.error('Error deleting submission:', err);
    req.flash('error', 'Error deleting submission.');
    res.redirect('/view-submissions'); // Redirect back to the submissions page on error
  }
});

module.exports = router;
