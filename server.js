const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');

require('dotenv').config()
/*
 * .env file should contain MONGO_URI = "mongodb+srv://[userid]:[passwd]@cluster0.brf1j.mongodb.net/[database]?"
 */

let mongoose;
try {
  mongoose = require("mongoose");
  mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected 🍕"));

} catch (e) {
  console.log(e);
}

const exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: true }
});
let ExerciseSession = mongoose.model('ExerciseSession', exerciseSessionSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, require: true},
  log: [exerciseSessionSchema]
});
let User = mongoose.model('User', userSchema);

const defaultDate = formatDateString( new Date().toDateString());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// POST to /api/users with form data username to create a new user
/*
{
  "_id": "6283fb517a0fcc06ac75a665",
  "username": "123mmaks09",
  "date": "Sat Dec 03 2022",
  "duration": 33,
  "description": "Swimming"
}
*/
app.post('/api/users', bodyParser.urlencoded({ extended: false }), function(req, res) {
  //console.log(req.body);
  let newUser = new User({
    username: req.body.username,
    log: []
  })
  newUser.save((err, result) => {
    if (err) {
      console.log(err);
    } else {
      let responseObj = {}
      responseObj['username'] = result.username;
      responseObj['_id'] = result.id.toString();
      res.json(responseObj);
    }
  })
});

// GET request to /api/users to get a list of all users
app.get('/api/users', function(req, res) {
  User.find({}, function(err, listOfUsers) {
    res.json(listOfUsers);
  })
})


//POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), function(req, res) {
  /* convert ObjecId to string */
  const oid = new Object(req.params._id).valueOf();
  
  let newExercise = new ExerciseSession({
    username: req.body.username,
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })
  // in case date filled is empty, assign Now to it
  if (!newExercise.date) {
    newExercise.date = new Date().toDateString()
  }
  
  // update
  User.findByIdAndUpdate(uid, { $push: { 'log': newExercise } }, { new: true }, function(err, updatedUser) {
    if (err) { console.log(err) }
    else {
      let responseObj = {}
      responseObj['_id'] = oid;
      responseObj['username'] = updatedUser.username;
      responseObj['description'] = newExercise.description;
      responseObj['duration'] = newExercise.duration;
      responseObj['date'] = new Date(newExercise.date).toDateString() || new Date().toDateString();
      res.json(responseObj);
    }
  })
});




// GET request to /api/users/:_id/logs to retrieve a full exercise log of any user
app.get('/api/users/:_id/logs', function(req, res) {
  
  let uid = req.params._id;
  const {from, to, limit} = req.query;
  
  User.findById(uid, function(err, foundUser) {
    if(!foundUser) return res.json({
      count: 0,
      log:[]
    })
    if(err){
      return res.json({ error: err})
    }

    // reformat log's date:
    for (index = 0; index < foundUser.log.length; index++) {
      var oridt = foundUser.log[index].date;
      var ndt = formatDateString(oridt);
      foundUser.log[index].date = ndt;
    }
    
    let responseObj = foundUser;
    responseObj['count'] = foundUser.log.length;
    responseObj['username'] = foundUser.username;

    let fromDate = new Date().toDateString();
    let toDate = new Date(0).toDateString();
    if (from) {
      fromDate = new Date(from).getTime();
    }
    if (to) {
      toDate = new Date(req.query.to).getTime();
    }  
    if (from || to) {
      responseObj.log = responseObj.log.filter((ExerciseSession) => {
        let logDate = new Date(ExerciseSession.date).getTime();
        responseObj.log.date = foundUser.log.date;
        return logDate >= fromDate && logDate <= toDate;
      });
    }

    if (parseFloat(limit) > 0){
      responseObj.log = responseObj.log.slice(0, parseInt(limit))
    }  
    responseObj['count'] = responseObj.log.length;

    for (idx=0; idx < responseObj.log.length; idx++) {
      if (isNaN(responseObj.log[idx].date) && responseObj.log[idx].date.length == 0) {
        responseObj.log[idx].date = defaultDate;
      } 
    }
    //console.log(responseObj);
    res.json(responseObj);
  
  })
});

/*
 * worker function to verify date.toDateString()
 */
function formatDateString(inDateStr) {
  let dateStr = new Date(inDateStr);
  const days = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
  ]
  var dayIndex = dateStr.getDay()
  var dayName = days[dayIndex] 
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]
  var monthIndex = dateStr.getMonth()
  var monthName = months[monthIndex]
  var year = dateStr.getFullYear() // 2019
  var date = dateStr.getDate() // 23

  return [dayName, monthName, date, year].join(' ');
}


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Microservice server is listening on port ' + listener.address().port)
})
