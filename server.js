const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs');
app.set('views', './views');

require('dotenv').config();

var db;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function (err, client) {
  if (err) return console.log('err');

  db = client.db('Work_schedule');

  app.listen(process.env.PORT, function () {
    console.log(process.env.PORT + '서버 입장!');
  });
});

app.get('/', function (req, res) {
  res.render('index.ejs');
});

app.get('/schedule', function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      res.render('index.ejs',{worker:data});
    });
});

app.get('/vacation', function (req, res) {
  db.collection('vacation')
    .find()
    .toArray(function (err, data) {
      res.render('vacation.ejs');
    });
});

app.post('/vacation_req', function (req, res) {
  db.collection('vacation').insertOne({ year: req.body.year, month: req.body.month, day: req.body.day, worker: req.body.worker }, function (err, data) {
    res.redirect('/vacation')
  });
});
