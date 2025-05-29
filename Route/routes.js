const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const User = require('../models/siginup');
const { requireAdmin } = require('../middleware/role'); // Middleware to check if the user is an admin
const Profile = require('../models/profile');

// Render form to create roles
router.get('/roles/create', requireAdmin, async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.user.username });
    res.render('Role', { profile, user: req.user }); // Pass the profile and user to the view
  } catch (error) {
    req.flash('error', 'Error loading role creation page');
    res.redirect('/admin-dashboard'); // Redirect to admin dashboard on error
  }
});

// Handle role creation
router.post('/roles/create', requireAdmin, async (req, res) => {
  const { name, permissions } = req.body;

  // Check if the role already exists
  const roleExists = await Role.findOne({ name });
  if (roleExists) {
    req.flash('error', 'Role already exists');
    return res.redirect('/roles/create');
  }

  try {
    const role = new Role({ name, permissions }); // Create a new role
    await role.save(); // Save the role to the database
    req.flash('success', 'Role created successfully');
    return res.redirect('/roles/create'); // Redirect back to the create role page
  } catch (error) {
    req.flash('error', 'Could not create role');
    return res.redirect('/roles/create');
  }
});

// Admin Dashboard Route (List Users and Assign Roles)
router.get('/admin-dashboard', requireAdmin, async (req, res) => {
  try {
    // Fetch users and available roles
    const users = await User.find();
    const roles = await Role.find();

    // Render the admin dashboard where roles can be assigned
    res.render('admin-dashboard', { users, roles, user: req.user });
  } catch (error) {
    req.flash('error', 'Error loading admin dashboard');
    res.redirect('/dashboard'); // Redirect to a safe route
  }
});

// Route to assign role to a user (Through admin dashboard)
router.get('/roles/assign/:userId',  async (req, res) => {
  const { userId } = req.params;  // Extract userId from the URL

  try {
    const user = await User.findById(userId);
    const roles = await Role.find();

    console.log( "user " ,userId, " user1",user, "Roole",roles); // Check data

    res.render('assignRole.ejs', { userId, roles, user });
  } catch (error) {
    console.log('Error:', error);
    res.redirect('/admin-dashboard');
  }
});


// Handle role assignment to a user
router.post('/assign-role/:userId', async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;  // The new role to be assigned

  try {
    const user = await User.findById(userId);  // Find user by ID
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/admin-dashboard');
    }

    // Assign the new role to the user
    user.role = role;
    await user.save();  // Save the user with the new role

    req.flash('success', `Role ${role} assigned to ${user.username}`);
    res.redirect('/admin-dashboard');  // Redirect to the admin dashboard
  } catch (error) {
    req.flash('error', 'Error assigning role');
    res.redirect('/admin-dashboard');
  }
});

module.exports = router;
