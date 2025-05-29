const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const CodeSubmission = require("./models/code");
const moment = require('moment');  
const{ requireStudent,  requireTeacher, requireAdmin,requireRole}=require("./middleware/role")
require("dotenv").config();

const methodOverride = require('method-override');

// Add this middleware


// Models
const User = require("./models/siginup");
const Question = require("./models/Questions");
const Profile = require("./models/profile");
const Student=require("./models/Student")
const TestResult=require("./models/typing");
const Teacher = require("./models/Teacher.js");
const Exam = require('./models/code.js');

// Passport strategy
const LocalStrategy = require("passport-local").Strategy;

// External Libraries
const ejsMate = require("ejs-mate");

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/user", // Your MongoDB URL
      collectionName: "sessions", // You can specify the collection name for storing sessions
      ttl: 14 * 24 * 60 * 60}),
    cookie: { maxAge: 3600000 }
  })
);

// Passport configuration
passport.use(new LocalStrategy({ usernameField: "email" }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(methodOverride('_method'));

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import routes
const passwordRoutes = require("./Route/password");
const signupRoutes = require("./Route/signup");
const profileRoutes = require("./Route/profile");
const teacherRoutes = require("./Route/Teacher");
const studentRoutes = require("./Route/Student");
const studentRoutes1 = require("./Route/Convert");
const typingRoutes = require("./Route/typing"); 
const CodeSubmission1=require("./Route/codeSubmission");
const Question1=require("./Route/Question")
const Route=require("./Route/routes.js")
// Use routes
app.use(signupRoutes);
app.use(passwordRoutes);
app.use(profileRoutes);
app.use(teacherRoutes);
app.use(studentRoutes);
app.use(studentRoutes1);
app.use(typingRoutes);
app.use(CodeSubmission1);
app.use(Question1);
app.use(Route);

// MongoDB URI
const uri = "mongodb://localhost:27017/user";

// Connect to MongoDB
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

  app.get("/run-codes", async (req, res) => {
    const { questionId } = req.query;
    
    if (!questionId) {
      return res.status(400).send("Question ID is required");
    }
    
    try {
      // Find the question by ID
      const question = await Question.findById(questionId);
      
      if (!question) {
        return res.status(404).send("Question not found");
      }
      
      // Find or create the student document
   
      
    
      
      // Get the student's profile
      const profile = await Profile.findOne({ username: req.user.username });
      
      // Render the exam page
      res.render("Exam", { layout: "layouts/biloperets", profile, user: req.user, question });
    } catch (error) {
      console.error(error);
      req.flash("error", "Error while taking the exam.");
      res.redirect("/student-dashboard");
    }
  });
// API endpoint to run code


// Function to calculate marks based on execution time (you can modify this logic)

app.post("/run-codes", async (req, res) => {
  const { script, language, questionId } = req.body;

  // Make sure the user is authenticated and that userId is available
  if (!req.user || !req.user.id) {
    return res.status(400).json({ error: "User is not authenticated" });
  }

  const userId = req.user.id;  // Get the user ID from the authenticated user (could be from session or JWT)

  if (!script || !language || !questionId) {
    return res.status(400).json({ error: "Script, language, and questionId are required" });
  }

  try {
    // Send code to JDoodle (or any other code execution service)
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script,
      language,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    // Extract relevant information from JDoodle response
    const { output, executionTime, cpuTime, memory } = response.data;

    // Calculate marks
    const marks = calculateMarks(executionTime, memory);

    // Save code submission with userId and other details
    const newSubmission = new CodeSubmission({
      code: script,
      language,
      questionId,
      marks,
      userId,  // Include the userId field here
      submittedAt: new Date(),
    });

    await newSubmission.save();

    // Send back the result
    res.json({
      output: output || "No output returned",
      executionTime,
      cpuTime,
      memory,
      marks,
    });
  } catch (error) {
    console.error("Error executing code:", error);
    res.status(500).json({ error: error.message || "Error executing code" });
  }
});


// Function to calculate marks based on execution time
function calculateMarks(executionTime, memory) {
  let marks = 10; // Set your full marks here
  if (executionTime > 500) marks -= 2; // Deduct 2 marks for execution time > 500ms
  if (memory > 500) marks -= 1;       // Deduct 1 mark for high memory usage
  return Math.max(marks, 0);           // Ensure marks don't go below 0
}

// Function to calculate marks based on execution time (you can modify this logic)



// Define the checkTestResult function
function checkTestResult(submission) {
  // Example: Check if the code contains 'fibonacci' keyword as an indication of passing
  return submission.code.includes('fibonacci');
}

// Define the calculateScore function
function calculateScore(submission) {
  const lineCount = submission.code.split('\n').length;
  const maxMarks = submission.questionId ? submission.questionId.marks : 0;  // Check if questionId is not null
  return Math.min(lineCount, maxMarks); // Ensure the score doesn't exceed the maximum marks
}

app.get("/teacher-dashboard", requireTeacher, async (req, res) => {
  if (!req.user) {
      req.flash("error", "Please log in to continue.");
      return res.redirect("/login");
  }

  try {
      console.log("Fetching teacher dashboard data...");

      // Fetch student count and today registrations (without admin data)
      const studentCount = await Student.countDocuments();
      console.log(`Student Count: ${studentCount}`);

      // Get the profile of the logged-in teacher
      const profile = await Profile.findOne({ username: req.user.username });
      const student=await Student.findOne({ languagePreference:req.user.languagePreference});
      console.log("Teacher Profile:", profile);

      // Get today's date using moment
      const today = moment().startOf('day').toDate();

      // Fetch upcoming tests (due date after today)
      const upcomingTests = await Question.find({
          dueDate: { $gt: today }
      }).sort({ dueDate: 1 });
      console.log("Upcoming Tests:", upcomingTests);

      // Fetch today's tests (due date is today)
      const todayTests = await Question.find({
          dueDate: { $eq: today }
      }).sort({ dueDate: 1 });
      console.log("Today's Tests:", todayTests);

      // Fetch all code submissions to determine passed/failed results
      const submissions = await CodeSubmission.find().populate('questionId userId');
      console.log("Submissions:", submissions);

      // Calculate results for each submission (passed or failed)
      const results = submissions.map(submission => {
          const passed = checkTestResult(submission); // Check if the submission passed
          const score = submission.questionId ? calculateScore(submission) : 0; // Calculate the score
          return {
              student: submission.userId.username,
              testTitle: submission.questionId ? submission.questionId.text : 'No Test',  // Ensure questionId is not null
              score: score,
              status: passed ? 'Passed' : 'Failed',
          };
      });

      // Pass the data to the view (teacher dashboard)
      res.render("teacher-dashboard.ejs", {
          layout: "layouts/biloperets",
          studentCount,
          user: req.user,
          upcomingTests,
          todayTests,
          results,
          student,
          profile
      });
  } catch (error) {
      console.error("Error occurred:", error); // Log the actual error
      req.flash("error", "Could not retrieve dashboard data.");
      res.redirect("/login");
  }
});


// Fetch upcoming exams
async function getUpcomingExams() {
  const today = moment().startOf('day').toDate();  // Get today's date at midnight
  const upcomingExams = await Question.find({
    dueDate: { $gt: today  }  // Only fetch exams where the due date is in the future
  }).sort({ dueDate: 1 });  // Sort by due date, ascending
  return upcomingExams;
}

// Fetch ongoing exams
async function getOngoingExams() {
  const today = moment().startOf('day').toDate();
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();  // Start of tomorrow
  const ongoingExams = await Question.find({
    dueDate: { $gte: today, $lt: tomorrow }  // Exams happening today
  }).sort({ dueDate: 1 });
  return ongoingExams;
}

// Fetch recent exams (already completed exams)
async function getRecentExams() {
  const today = moment().startOf('day').toDate();  // Get today's date at midnight
  const recentExams = await Question.find({
    dueDate: { $lt: today }  // Exams that have already passed
  }).sort({ dueDate: -1 });  // Sort by due date, descending
  return recentExams;
}

// Student Dashboard Route
app.get('/student-dashboard', requireStudent, async (req, res) => {
  if (!req.user) {
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
}
  try {
    // Fetch student profile and exam-related data concurrently to improve performance
    const [profile, upcomingExams, ongoingExams, recentExams] = await Promise.all([
      Profile.findOne({ username: req.user.username }),
      getUpcomingExams(),
      getOngoingExams(),
      getRecentExams()
    ]);
    const student=await Student.findOne({ languagePreference:req.user.languagePreference});

    // Calculate counts and any additional data needed
    const upcomingExamsCount = upcomingExams.length;
    const ongoingExamsCount = ongoingExams.length;
    const recentExamsCount = recentExams.length;

    // Optionally, you can enhance the profile with additional user-specific data, such as test performance
    const userPerformance = await getUserPerformance(req.user._id);

    // Passing data to the EJS view for rendering
    res.render('student-dashboard', {
      layout: 'layouts/biloperets',  // Adjust the layout as needed
      upcomingExamsCount,
      ongoingExamsCount,
      recentExamsCount,
      upcomingExams,
      student,
      userPerformance,  // Pass performance data if applicable
      profile,
      user: req.user // Pass user data to personalize the UI
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    req.flash("error", "An error occurred while fetching your dashboard data.");
    res.redirect("/dashboard");  // Redirect to a fallback page
  }
});

// Example function to get user-specific performance data (you can modify as needed)
async function getUserPerformance(userId) {
  // You can fetch performance-related data such as completed tests, average score, etc.
  const completedTests = await CodeSubmission.find({ userId }).populate('questionId');
  const averageScore = calculateAverageScore(completedTests);

  return { completedTests: completedTests.length, averageScore };
}

// Function to calculate average score (you can customize based on the score system)
function calculateAverageScore(tests) {
  if (tests.length === 0) return 0;
  
  const totalScore = tests.reduce((acc, test) => acc + (test.score || 0), 0);
  return totalScore / tests.length;
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
