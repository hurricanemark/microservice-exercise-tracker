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
let Session = mongoose.model('Session', exerciseSessionSchema); 

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




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Microservice server is listening on port ' + listener.address().port)
})
