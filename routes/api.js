const express = require('express');
require('dotenv').config();

var router = express.Router();

const TURN_SERVER = process.env.TURN_URL
const TURN_USERNAME = process.env.TURN_USERNAME
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL


router.get('/get-servers', (req, res, next) => {
    res.json([
        {
            "urls": "stun:stun.l.google.com:19302"
        },
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

module.exports = router;
