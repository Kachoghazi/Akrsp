const mongoose = require('mongoose');

const CodeSubmissionSchema = new mongoose.Schema({
    code: {
      type: String,
      required: true
    },
    language: {
      type: String,
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    marks: {  // Store only marks
      type: Number,
      default: null
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
});

module.exports = mongoose.model('CodeSubmission', CodeSubmissionSchema);
