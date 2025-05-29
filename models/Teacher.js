const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to User model
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    middleName: {
        type: String,
        default: '', // Optional field
    },
    lastName: {
        type: String,
        required: true,
    },
    fatherName: {
        type: String,
        required: true,
    },
    motherName: {
        type: String,
        default: '', // Optional field
    },
    mobileNo: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        default: '', // Optional field
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Middleware to update the updatedAt field
teacherSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;
