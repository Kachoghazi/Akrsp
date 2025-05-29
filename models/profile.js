// User model (models/profile.js)
const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true, // Ensure username is unique
    },
    fatherName: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'], // Specify allowed values
        required: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true, // Ensure phone number is unique
    },
 
    profilePic: {
        type: String, // Path to the uploaded image
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically set createdAt to current date
    },
    updatedAt: {
        type: Date,
        default: Date.now, // Automatically set updatedAt to current date
    },
});

// Middleware to update `updatedAt` field before saving
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create the User model
const Profile = mongoose.model('Profile', userSchema);

module.exports = Profile;
