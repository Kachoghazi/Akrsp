const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    timerDuration: {
        type: Number,
        required: true, // Duration in seconds
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    marks:{
     type:Number,
     required:true,
    },
    language: {
        type: String,
      },
      
    teacherId: { // Field for the teacher's ID
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming you have a User model
        required: true,
    },
    adminId: { // Field for the admin's ID (if applicable)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming you have an Admin model
    },
});

// Middleware to update the updatedAt field before saving
questionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;
