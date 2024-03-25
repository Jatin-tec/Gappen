const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    fingerPrint: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    visitedCounter: {
        type: Number,
        default: 0,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    blackListed: {
        type: Boolean,
        default: false,
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now,
    },
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session
