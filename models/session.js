const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    location: {
        type: { type: String, enum: ['Point'], required: false },
        coordinates: { type: [Number], required: false } // [longitude, latitude]
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

sessionSchema.index({ location: '2dsphere' });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session
