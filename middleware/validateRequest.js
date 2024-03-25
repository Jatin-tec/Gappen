const Session = require('../models/session')
const uuid = require('uuid');

async function checkBlocked(req, res, next) {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let sessionId = req.cookies['sessionId']; // Try to get the session ID from cookies

        // generate a random session ID
        if(!sessionId) {
        sessionId = uuid.v4();
        res.cookie('sessionId', sessionId, { maxAge: 24 * 60 * 60 * 1000 * 30, httpOnly: true });
        }

        let session = await Session.findOne({ sessionId: sessionId });
        if (session) {
            // Session exists, check if it's blacklisted
            if (session.blackListed) {
                return res.status(403).send("Access denied. Your session has been blacklisted.");
            }
            // Update session details
            session.lastAccessedAt = new Date();
            session.visitedCounter = session.visitedCounter + 1 || 1; // Increment visit counter
            await session.save();
        } else {
            // Create a new session if it doesn't exist
            session = new Session({
                sessionId: sessionId,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000 * 30),
                lastAccessedAt: new Date(),
            });
            await session.save();
        }
        req.session = session;
        
        console.log(`Checking blocked status for IP: ${ip}, Session ID: ${session.sessionId}`);
        next();
    } catch (error) {
        console.error('Error in session handling:', error);
        res.status(500).send("An error occurred.");
    }
}

module.exports = { checkBlocked };