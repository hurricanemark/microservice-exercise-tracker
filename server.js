const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const moment = require('moment');
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
  date: { type: Date, required: true }
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
  console.log('exercises-- uid: ',uid)
  console.log('\n',req.body);
  
  let newExercise = new ExerciseSession({
    username: req.body.username,
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date || defaultDate,
    _id: uid.toString()
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
      console.log("UpdatedUSER: ",updatedUser);
      
      let responseObj = {}
      responseObj['_id'] = uid;
      responseObj['username'] = updatedUser.username;
      responseObj['description'] = newExercise.description;
      responseObj['duration'] = newExercise.duration;
      responseObj['date'] = newExercise.date.toDateString() || new date().toDateString();

      console.log('\n----------->');
      console.log(responseObj);
      console.log('\n<-----------\n');
      
      res.json(responseObj);
    }
  })
});




// GET request to /api/users/:_id/logs to retrieve a full exercise log of any user
app.get('/api/users/:_id/logs', function(req, res) {
  
  let uid = req.params._id
  console.log("uid:", uid);
  //console.log(uid)
  User.findById(uid, function(err, foundUser) {
    if(!foundUser) return res.json({
      count: 0,
      log:[]
    })
    if(err){
      return res.json({ error: err})
    }

    let responseObj = foundUser;

    let newSession = new ExerciseSession({
      description: foundUser.log.description,
      duration: parseInt(foundUser.log.duration),
      date: moment(foundUser.log.date).format('YYYY-MM-DD').toString()
    });
    
    
    if (!newSession.date) {
      newSession.date = new Date().toDateString();
    }
    
    console.log("NewSession date: ", newSession.date);
    
    responseObj['username'] = foundUser.username;



    if (req.query.from || req.query.to) {
      let fromDate = new Date().toDateString();
      let toDate = new Date(0).toDateString();
      if (req.query.from) {
        fromDate = new Date(req.query.from).getTime();
      }
      if (req.query.to) {
        toDate = new Date(req.query.to).getTime();
      }
      responseObj.log = responseObj.log.filter((ExerciseSession) => {
        let logDate = new Date(ExerciseSession.date).getTime();
        responseObj.log.date = newSession.date.toDateString();
        return logDate >= fromDate && logDate <= toDate;
      });

      if (req.query.limit){
        responseObj.log = responseObj.log.slice(0, req.query.limit)
      }      
    }

    responseObj['count'] = foundUser.log.length;
    
    
    console.log(responseObj);
    res.json(responseObj);
  
  })
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Microservice server is listening on port ' + listener.address().port)
})
