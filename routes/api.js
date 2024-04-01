const express = require('express');
require('dotenv').config();
const Session = require('../models/session')

var router = express.Router();

const TURN_SERVER = process.env.TURN_URL
const TURN_USERNAME = process.env.TURN_USERNAME
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL


router.get('/get-servers', (req, res, next) => {
    res.json([
        {
            "urls": "stun:stun1.l.google.com:19302"
        },
        {
            "urls": TURN_SERVER,
            "username": TURN_USERNAME,
            "credential": TURN_CREDENTIAL
        },
    ])
});

router.post('/update-location', (req, res, next) => {
    console.log('Request body:', req.body);
    const { latitude, longitude } = req.body;
    const sessionId = req.session.sessionId;

    console.log('Latitude:', latitude, 'Longitude:', longitude);

    Session.findOneAndUpdate({
        sessionId: sessionId
    }, {
        location: {
            type: 'Point',
            coordinates: [longitude, latitude]
        }
    }, {
        upsert: true
    }).then(() => {
        console.log('Location updated successfully');
        res.sendStatus(200);
    }).catch(error => {
        console.error('Error updating location:', error);
        res.sendStatus(500);
    });
});

module.exports = router;
