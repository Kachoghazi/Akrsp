const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    time: Number,
    accuracy: Number,
    speed: Number
}, { timestamps: true });
TestResultSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});
module.exports = mongoose.model('TestResult', TestResultSchema);
