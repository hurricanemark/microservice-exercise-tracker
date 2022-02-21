const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
let mongoose;
try {
  mongoose = require("mongoose");
  mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log("MongoDB Connected 🍕"));

} catch (e) {
  console.log(e);
}

const exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true},
  date: { type: Date, required: true}
});
let ExerciseSession = mongoose.model('ExerciseSession', exerciseSessionSchema); 

const userSchema = new mongoose.Schema({
  username: { type: String, required: true},
  log: [exerciseSessionSchema]
});
let User = mongoose.model('User', userSchema);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// POST to /api/users with form data username to create a new user
app.post('/api/users', bodyParser.urlencoded({ extended: false }), function(req, res) {
  console.log(req.body);
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


// POST to /api/users/:_id/exercises with form data description, duration, and optionally date. If no date is supplied, the current date will be used.
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), function(req, res) {
  let uid = req.params._id
  console.log(req.body)
  console.log("HEY look!: ",uid);
  let newExercise = new ExerciseSession({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })
  // in case date filed is empty, assign Now to it
  if (newExercise.date === '') {
    newExercise.date = new Date().toISOString().substring(0, 10);
  }
  // update
  User.findByIdAndUpdate(uid, {$push: {'log': newExercise }}, {new: true}, function(err, updatedUser) {
    if (err) {console.log(err)}
    else {
      console.log("UpdatedUSER: ",updatedUser);
      let responseObj = {}
      
      responseObj['username'] = updatedUser.username;
      responseObj['description'] = newExercise.description;
      responseObj['duration'] = newExercise.duration;
      responseObj['date'] = new Date(newExercise.date).toDateString();
      //responseObj['date'] = newExercise.date;
      responseObj['_id'] = uid;

      res.json(responseObj);
    }
  })
});

// GET request to /api/users/:_id/logs to retrieve a full exercise log of any user
app.get('/api/users/:_id/logs', function(req, res) {
  let uid = req.params._id
  console.log(uid)
  User.findById(uid, function(err, foundUser) {
    if (err) { 
      console.log(err) 
    } else {
      console.log(foundUser)
      let responseObj = {}
      responseObj['username'] = foundUser.username;
      responseObj['count'] = foundUser.log.length;
      res.json(responseObj);
    }
  })
});


//GET request to /api/users/:id/logs will return the user object with a log array of all the exercises added.
app.get('/api/users/:id/logs', function(req, res) {
  let uid = req.params.id
  console.log(uid)
  User.findById(uid, function(err, foundUser) {
    if (err) { 
      console.log(err) 
    } else {
      console.log("WHA-WHA: ", foundUser.log)
      res.json(foundUser);
    }
  })
});


app.get('/api/exercise/log', function(req, res){
  console.log(req.query.userID)

  res.json({})
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Microservice server is listening on port ' + listener.address().port)
})
