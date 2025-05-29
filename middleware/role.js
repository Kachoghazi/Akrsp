const User = require('../models/siginup');  // User model to check the user role

// Middleware to check for a specific user's role dynamically
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      req.flash("error", "Access denied. You do not have the required role.");
      return res.redirect("/login");
    }
    next();
  };
}

// Middleware to check if a user is logged in as an admin
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'You do not have permission to access this');
  return res.redirect('/dashboard');
}

// Middleware to check if the user is a teacher
function requireTeacher(req, res, next) {
  if (req.user && req.user.role === 'teacher') {
    return next();
  }
  req.flash("error", "Teacher access required.");
  return res.redirect("/login");
}

// Middleware to check if the user is a student
function requireStudent(req, res, next) {
  if (req.user && req.user.role === 'student') {
    return next();
  }
  req.flash("error", "Student access required.");
  return res.redirect("/login");
}

module.exports = { requireRole, requireAdmin, requireTeacher, requireStudent,requireAdminOrTeacher,requireStudentOrAdmin };
// Middleware to check if the user is either an admin or a teacher
function requireAdminOrTeacher(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
    return next();
  }
  req.flash("error", "You do not have permission to access this");
  return res.redirect('/dashboard');  // Redirect to a dashboard or any page you want
}
// Middleware to check if the user is either an admin or a teacher
function requireStudentOrAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'student')) {
    return next();
  }
  req.flash("error", "You do not have permission to access this");
  return res.redirect('/dashboard');  // Redirect to a dashboard or any page you want
}