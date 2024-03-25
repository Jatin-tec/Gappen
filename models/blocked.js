const mongoose = require('mongoose');

const blockedIpSchema = new mongoose.Schema({
    ip: {
        type: String,
        required: true,
    },
    blockedReason: {
        type: String,
        required: true,
    },
    blockedAt: {
        type: Date,
        default: Date.now,
    },
});

const BlockedIp = mongoose.model('BlockedIp', blockedIpSchema);
module.exports = BlockedIp