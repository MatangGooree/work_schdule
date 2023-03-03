const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs');
app.set('views', './views');

require('dotenv').config()

var db;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function (err, client) {
  if (err) return console.log('err');
  
  db = client.db('Work_schedule');
  
  
  app.listen(process.env.PORT, function () {
    console.log(process.env.PORT +'서버 입장!');
  });
});



app.get('/', function (req, res) {
  res.render('index.ejs');
});

app.get('/schedule', function (req, res) {
  res.render('index.ejs');
});

app.get('/vacation', function (req, res) {
  //db의 휴가자를 받아 함께 렌더링
  db.collection('vacation').find().toArray(function(err,data){
    res.render('vacation.ejs',{vacation:data});
  })

});

app.post('/vacation_req', function (req, res) {
  // 받은 정보를 DB에 저장,대체근무자로 이름을 바꾼 뒤
  //페이지를 렌더링 할 때 해당 정보를 담아 렌더링
  //해당 페이지ejs 에서 innerhtml을 수정

  db.collection('vacation').insertOne({year:req.body.year , month :req.body.month , day :req.body.day , worker : req.body.worker},function(err,data){

  })



});
