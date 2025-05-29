const mongoose = require('mongoose');

// Role Schema
const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    permissions: { 
        type: [String], 
        default: [] 
    }
});

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
