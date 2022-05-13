const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
//const moment = require('moment');
require('dotenv').config()
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

const defaultDate = () => new Date().toDateString();

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// POST to /api/users with form data username to create a new user
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
      responseObj['_id'] = result.id;
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
  let uid = req.params._id
  
  let newExercise = new ExerciseSession({
    username: req.body.username,
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date || defaultDate
  })
  // in case date filled is empty, assign Now to it
  if (!newExercise.date) {
    // newExercise.date = new 
    newExercise.date = new Date().toDateString()
  }
  
  // update
  User.findByIdAndUpdate(uid, { $push: { 'log': newExercise } }, { new: true }, function(err, updatedUser) {
    if (err) { console.log(err) }
    else {
      let responseObj = {}
      responseObj['_id'] = uid.toString();
      responseObj['username'] = updatedUser.username;
      responseObj['description'] = newExercise.description;
      responseObj['duration'] = newExercise.duration;
      responseObj['date'] = new Date(newExercise.date).toDateString() || new Date().toDateString();

      // console.log('\n----------->');
      // console.log(responseObj);
      // console.log('\n<-----------\n');
      
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
      // console.log('===============');
      // console.log('DEBUG(before) -- logDate: ', foundUser.log[index].date);
      var oridt = foundUser.log[index].date;
      var ndt = formatDateString(oridt);
      foundUser.log[index].date = ndt;
      // console.log('DEBUG(after) formattedLogDate: ', ndt);
      // console.log('---> ', foundUser.log[index].date);

      // console.log('===============');
    }


    
    let responseObj = foundUser;
    responseObj['count'] = foundUser.log.length;
    
    // let newSession = new ExerciseSession({
    //   description: foundUser.log.description,
    //   duration: parseInt(foundUser.log.duration),
    //   date: foundUser.log.date
    // });
    
    
    // if (!newSession.date) {
    //   newSession.date = new Date().toDateString();
    // }
    
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
      console.log('got from-to: ', from);
    }

    if (parseFloat(limit) > 0){
      responseObj.log = responseObj.log.slice(0, parseInt(limit))
    }  
    responseObj['count'] = responseObj.log.length;

    
    console.log(responseObj);
    res.json(responseObj);
  
  })
});


function formatDateString(inDateStr) {
  let dateStr = new Date(inDateStr);
  //console.log('DEBUG: inDateStr: ', inDateStr);
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
  var dayName = days[dayIndex] // Thu
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

  return dayName + ', ' + [monthName, date, year].join(' ');
}


app.get('/api/exercise/log', (req, res) => {
  const {userId, from, to, limit} = req.query;
  
  let temp=getExercisesFromUserWithId(userId);
  
  if(from){
    const fromDate= new Date(from)
    temp = temp.filter(exe => new Date(exe.date) > fromDate);
  }
  
  if(to){
    const toDate = new Date(to)
    temp = temp.filter(exe => new Date(exe.date) < toDate);
  }
  
  if(limit){
    temp = temp.slice(0,limit);
  }
  
  const log = {
    _id:userId,
    username:getUsernameById(userId),
    count:parseFloat(temp.length),
    log:temp
  }
  
  res.json(log)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Microservice server is listening on port ' + listener.address().port)
})
