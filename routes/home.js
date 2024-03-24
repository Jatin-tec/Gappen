const express = require('express');
const path = require('path');
const fs = require('fs');

var router = express.Router();

const namesPath = path.join(__dirname + '/assets/names.txt')

function getRandomName() {
  return new Promise((resolve, reject) => {
    fs.readFile(namesPath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      }
      // Splitting the content by new lines to get an array of names
      const names = data.split('\n');
      
      // Checking if the names array actually has names
      if (names.length > 0) {
        // Generating a random index based on the length of the names array
        const randomIndex = Math.floor(Math.random() * names.length);
        // Accessing a random name using the random index
        const randomName = names[randomIndex];
        resolve(randomName);
      } else {
        reject('No names found');
      }
    })
  })
}

router.get('/', async (req, res, next) => {
  try {
    const randomName = await getRandomName();
    console.log('Random name:', randomName);
    res.render('index.ejs', { randomName });
  } catch (error) {
    console.error('Error getting random name:', error);
    res.render('index.ejs', { randomName: '' });
  }
});

module.exports = router;
