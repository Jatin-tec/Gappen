const express = require('express');

var router = express.Router();

router.get('/:room_id', (req, res, next) => {
    var room_id = req.params.room_id;
    console.log(room_id)
    res.render('call.ejs', { "room_id": room_id });
  });
  
module.exports = router;
