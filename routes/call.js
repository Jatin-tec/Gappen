const express = require('express');

var router = express.Router();

router.get('/', (req, res, next) => {
    const userName = req.query.userName
    if (!userName) {
      return res.redirect('/');
    }
    res.render('call.ejs', { userName: userName });
  });
  
module.exports = router;
