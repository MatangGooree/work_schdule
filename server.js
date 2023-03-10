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
  res.render('schedule.ejs');
});

app.get('/schedule', function (req, res) {
  res.render('schedule.ejs');
});

app.get('/vacation', function (req, res) {
  db.collection('vacation')
    .find()
    .toArray(function (err, data) {
      res.render('vacation.ejs');
    });
});

app.get('/data/workers', function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      var workers = [];

      for (let i = 0; i < data.length; i++) {
        workers.push(data[i].worker);
      }
      res.json(JSON.stringify(workers));
    });
});

app.post('/vacation_req', function (req, res) {
  console.log('신청 수신');
  req.body.year = parseInt(req.body.year);
  req.body.month = parseInt(req.body.month);
  req.body.day = parseInt(req.body.day);

  db.collection('vacation').insertOne(
    { year: req.body.year, month: req.body.month, day: req.body.day, worker: req.body.worker, time: req.body.time, changed: req.body.changed_worker },
    function (err, data) {
      res.redirect('/vacation');
    }
  );
});

app.get('/data/vac_req', function (req, res) {
  db.collection('vacation')
    .find()
    .toArray(function (err, data) {
      res.json(JSON.stringify(data));
    });
});

//로그인기능

//휴가취소 버튼

//휴가갯수 카운트

//24시간 풀근무 못하도록

//본인 휴가신청 버튼만 보이도록