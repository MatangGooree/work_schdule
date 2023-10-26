const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

const MongoClient = require('mongodb').MongoClient;

app.set('view engine', 'ejs');
app.set('views', './views');

require('dotenv').config();

app.use('/public', express.static('public'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const { ObjectId } = require('mongodb');

app.use(session({ secret: '비밀코드', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

const schedule = require('node-schedule');

var moment = require('moment');
const { render } = require('ejs');

require('moment-timezone');

moment.tz.setDefault('Asia/Seoul');

var db;
MongoClient.connect(process.env.DB_URL, { useUnifiedTopology: true }, function (err, client) {
  if (err) return console.log('err');

  db = client.db('Work_schedule');

  app.listen(process.env.PORT, function () {
    console.log(process.env.PORT + '서버 입장!');
  });
});

var now_date = new Date(); //현재시각
var year = now_date.getFullYear(); //현재 년
var month = now_date.getMonth() + 1; //현재 월 (1월이 0부터 시작)
var day = parseInt(now_date.getDate()); //현재 일
var last_day = new Date(year, month, 0).getDate(); //마지막 일자 구하기

const add_vac = schedule.scheduleJob('0 0 14 14 * *', function () {
  //매달 15일 2시마다 휴가 갯수 1개씩 증가
  console.log('휴가,대근 추가');
  db.collection('workers').updateMany({}, { $inc: { vac_count: 1, ins_work: 1 } }, function (err, data) {});
});

app.get('/', function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      res.render('schedule-sheet.ejs', { user: req.user, worker_data: data });
    });
});

app.get('/schedule-cal', function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      res.render('schedule.ejs', { user: req.user, worker_data: data });
    });
});
app.get('/schedule-cal/my', login_ask, function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      res.render('schedule-my.ejs', { user: req.user, worker_data: data });
    });
});

app.get('/schedule', function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      res.render('schedule-sheet.ejs', { user: req.user, worker_data: data });
    });
});

app.get('/vacation', login_ask, function (req, res) {
  if (String(req.user._id) == '6411aa8dc07abd2e31d863d8') {
    res.render('vacation-admin.ejs', { user: req.user });
  } else if (String(req.user._id) == '641be3dde51413f24536fadf') {
    res.render('vacation-5.ejs', { user: req.user });
  } else {
    res.render('vacation.ejs', { user: req.user });
  }
});

app.get('/mypage', function (req, res) {
  db.collection('workers').findOne({ _id: req.user._id }, function (err, data) {
    console.log(data);
    res.render('mypage.ejs', { my_data: data });
  });
});

app.get('/data/workers', function (req, res) {
  db.collection('workers')
    .find()
    .toArray(function (err, data) {
      var workers = [];

      for (let i = 0; i < data.length; i++) {
        workers.push(data[i]);
      }
      res.json(JSON.stringify(workers));
    });
});

app.post('/vacation_req', function (req, res) {
  now_date = new Date(); //현재시각
  year = now_date.getFullYear(); //현재 년
  month = now_date.getMonth() + 1; //현재 월 (1월이 0부터 시작)
  day = parseInt(now_date.getDate()); //현재 일
  last_day = new Date(year, month, 0).getDate(); //마지막 일자 구하기

  console.log('휴가 신청 수신');
  var time = moment().format('YYYY-MM-DD HH:mm:ss');
  var last_month_day = new Date(year, month - 1, 0).getDate(); //전달의 마지막 일자 구하기

  req.body.year = parseInt(req.body.year);
  req.body.month = parseInt(req.body.month);
  req.body.day = parseInt(req.body.day);

  db.collection('workers').findOne({ authority: 'admin' }, function (err, data) {
    var admin_id = data._id;
    db.collection('vacation').findOne(
      {
        //24시간 근무 하지 못하도록
        $or: [
          { day: req.body.day - 1, time: 'night', year: req.body.year, month: req.body.month, changed: req.body.changed_worker }, //전날밤
          { day: req.body.day + 1, time: 'day', year: req.body.year, month: req.body.month, changed: req.body.changed_worker }, //다음날 아침
          { day: 1, time: 'day', year: req.body.year, month: req.body.month + 1, changed: req.body.changed_worker }, //다음날 아침(말일)
          { day: last_month_day, time: 'night', year: req.body.year, month: req.body.month - 1, changed: req.body.changed_worker }, //전날 밤 (1일)
          { day: 31, time: 'night', year: req.body.year, month: 12, changed: req.body.changed_worker }, //전년도 12월31일(1월1일)
          { day: 1, time: 'day', year: req.body.year + 1, month: 1, changed: req.body.changed_worker }, //다음년도 1월1일(해당년의 마지막날)
        ],
      },
      function (err, data) {
        var exist_changed = data;

        db.collection('workers').findOne({ worker: req.body.changed_worker }, function (err, data) {
          var changed_ins_count = data;
          db.collection('workers').findOne({ _id: req.user._id }, function (err, data) {
            var my_vac_count = data.vac_count;
            var my_day_vac = data.day_vac;
            var my_night_vac = data.night_vac;

            if (String(req.user._id) == String(admin_id)) {
              db.collection('vacation').insertOne(
                { year: req.body.year, month: req.body.month, day: req.body.day, worker: req.body.worker, time: req.body.time, changed: req.body.changed_worker, submit_time: time },
                function (err, data) {
                  //휴가 갯수, 대근갯수 조정
                  db.collection('workers').updateOne({ worker: req.body.worker }, { $inc: { vac_count: -1 } });
                  db.collection('workers').updateOne({ worker: req.body.changed_worker }, { $inc: { ins_work: -1 } });

                  if (req.body.time == 'day') {
                    db.collection('workers').updateOne({ worker: req.body.worker }, { $inc: { day_vac: 1 } });
                  } else if (req.body.time == 'night') {
                    db.collection('workers').updateOne({ worker: req.body.worker }, { $inc: { night_vac: 1 } });
                  }
                  return res.redirect('/vacation_admin');
                }
              );
            } else if (String(req.user._id) == String('641be3dde51413f24536fadf')) {
              //관리자 본인 휴가신청
              db.collection('vacation').insertOne({ year: req.body.year, month: req.body.month, day: req.body.day, worker: req.user.worker, submit_time: time }, function (err, data) {
                db.collection('workers').updateOne({ worker: req.user.worker }, { $inc: { vac_count: -1 } });
                return res.redirect('/vacation-5');
              });
            } else if (day != last_day && day != 15) {
              return res.send("<script>alert('휴가 신청일이 아닙니다');location.href='/vacation';</script>");
            } else if (req.body.day < day && req.body.month <= month) {
              return res.send(`<script>alert('과거의 휴가 입니다');location.href='/vacation';</script>`);
            } else if (my_vac_count == 0) {
              return res.send(`<script>alert('휴가 사용이 불가능 합니다 (본인 잔여 휴가 부족)');location.href='/vacation';</script>`);
            } else if ((day == 15 && req.body.month <= month) || (day == last_day && req.body.month == month + 1 && req.body.day <= 15)) {
              return res.send("<script>alert('휴가 사용 가능일이 아닙니다(2주)');location.href='/vacation';</script>");
            } else if (changed_ins_count.ins_work == 0) {
              return res.send(`<script>alert('${changed_ins_count.worker}의 대근이 불가능 합니다 (잔여 대근 부족)');location.href='/vacation';</script>`);
            } else if (exist_changed !== null) {
              return res.send(`<script>alert('${exist_changed.changed}의 대근이 불가능 합니다 (24시간 근무)');location.href='/vacation';</script>`);
            } else if (my_day_vac <= 0) {
              return res.send(`<script>alert('주간 휴가 사용이 불가능 합니다 (본인 주간 휴가 부족	)');location.href='/vacation';</script>`);
            } else if (my_night_vac <= 0) {
              return res.send(`<script>alert('야간 휴가 사용이 불가능 합니다 (본인 야간 휴가 부족	)');location.href='/vacation';</script>`);
            } else {
              db.collection('vacation').insertOne(
                { year: req.body.year, month: req.body.month, day: req.body.day, worker: req.body.worker, time: req.body.time, changed: req.body.changed_worker, submit_time: time },
                function (err, data) {
                  //휴가 갯수, 대근갯수 조정
                  console.log('durlsrk');
                  db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { vac_count: -1 } });
                  db.collection('workers').updateOne({ worker: req.body.changed_worker }, { $inc: { ins_work: -1 } });

                  if (req.body.time == 'day') {
                    db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { day_vac: 1 } });
                  } else if (req.body.time == 'night') {
                    db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { night_vac: 1 } });
                  }

                  return res.redirect('/vacation');
                }
              );
            }
          });
        });
      }
    );
  });
  //달이 넘어갈 때(1일,말일)
});

app.get('/data/vac_req', function (req, res) {
  db.collection('vacation')
    .find()
    .toArray(function (err, data) {
      res.json(JSON.stringify(data));
    });
});

app.get('/login', function (req, res) {
  res.render('login.ejs');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/fail' }), function (req, res) {
  res.redirect('/');
});

app.get('/fail', function (req, res) {
  res.send("<script>alert('아이디 / 비밀번호가 틀렸습니다.');location.href='/login';</script>");
});

//로그인 , 회원가입 기능

passport.use(
  new LocalStrategy(
    {
      usernameField: 'id', //요청을 보낼 form 에서 name=id 에 해당하는 인풋을 이름으로 쓸 것이다
      passwordField: 'pw', //요청을 보낼 form 에서 name=pw 에 해당하는 인풋을 비번으로 쓸 것이다
      session: true, //세션을 만들 지 여부
      passReqToCallback: false, //아이디, 비밀번호 외에 다른 정보검사가 필요한지
    },
    function (입력한아이디, 입력한비번, done) {
      //입력한 아이디/비번 전송되면 콜백함수 실행
      db.collection('workers').findOne({ user_id: 입력한아이디 }, function (에러, 결과) {
        if (!결과) {
          // login 컬렉션에서 입력한 아이디를 찾아보고, 그 값이 없으면
          return done(null, false, { message: '존재하지않는 아이디요' });
        }
        if (입력한비번 == 결과.user_pw) {
          //입력한 id 값이 존재하고, 비밀번호가 일치하면
          return done(null, 결과); //반환 -> data 는 { _id: ~~, id: '아이디', pw: '비번' } 의 형태
        } else {
          return done(null, false, { message: '비번틀렸어요' });
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user._id); //user 를 저장해도 되지만 id만 저장하는게 효율적?
});

passport.deserializeUser(function (아이디, done) {
  var Obj_id = ObjectId(아이디); //DB 내에서 찾으려는 데이터의 형식과 맞춰준다.
  db.collection('workers').findOne({ _id: Obj_id }, function (err, data) {
    done(null, data);
  });
});

function login_ask(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("<script>alert('로그인을 해 주세요');location.href='/login';</script>");
  }
}

app.get('/logout', login_ask, function (req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

//휴가취소 기능

app.delete('/delete/vacation', function (req, res) {
  now_date = new Date(); //현재시각
  year = now_date.getFullYear(); //현재 년
  month = now_date.getMonth() + 1; //현재 월 (1월이 0부터 시작)
  day = parseInt(now_date.getDate()); //현재 일
  last_day = new Date(year, month, 0).getDate(); //마지막 일자 구하기

  console.log('휴가 취소 신청 수신');
  req.body.year = parseInt(req.body.year);
  req.body.month = parseInt(req.body.month);
  req.body.day = parseInt(req.body.day);

  db.collection('workers').findOne({ authority: 'admin' }, function (err, data) {
    if (String(req.user._id) == String(data._id)) {
      //관리자면
      db.collection('vacation').deleteOne({ year: req.body.year, month: req.body.month, day: req.body.day, time: req.body.time }, function (err, data) {
        //휴가, 대근 갯수 조정
        db.collection('workers').updateOne({ worker: req.body.worker }, { $inc: { vac_count: 1 }, function() {} });
        db.collection('workers').updateOne({ worker: req.body.changed_worker }, { $inc: { ins_work: 1 } });
        if (req.body.time == 'day') {
          db.collection('workers').updateOne({ worker: req.body.worker }, { $inc: { day_vac: -1 } });
        } else if (req.body.time == 'night') {
          db.collection('workers').updateOne({ worker: req.body.worker }, { $inc: { night_vac: -1 } });
        }
        return;
      });
    } else if (day !== last_day && day !== 15) {
      console.log('휴가신청일 아님');
      return res.send("<script>alert('휴가 신청일이 아닙니다');location.href='/vacation';</script>");
    } else if (req.body.day < day && req.body.month <= month) {
      console.log('과거');
      return res.send(`<script>alert('과거의 휴가 입니다');location.href='/vacation';</script>`);
    } else {
      //신청일에만 가능
      db.collection('vacation').deleteOne({ year: req.body.year, month: req.body.month, day: req.body.day, time: req.body.time }, function (err, data) {
        //휴가, 대근 갯수 조정
        db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { vac_count: 1 }, function() {} });
        db.collection('workers').updateOne({ worker: req.body.changed_worker }, { $inc: { ins_work: 1 } });

        if (req.body.time == 'day') {
          db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { day_vac: -1 } });
        } else if (req.body.time == 'night') {
          db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { night_vac: -1 } });
        }
      });
    }
  });
});

app.get('/change_pw', function (req, res) {
  res.render('change-pw.ejs', { user: req.user });
});

app.post('/change_pw', function (req, res) {
  if (req.body.new_pw1 != req.body.new_pw2) {
    //패스워드가 다르면
    res.send("<script>alert('변경할 두 비밀번호 다름');location.href='/change_pw';</script>");
    return;
  } else if (req.body.now_pw != req.user.user_pw) {
    res.send("<script>alert('현재 비밀번호 틀립');location.href='/change_pw';</script>");
    return;
  } else {
    //둘 다 충족 시
    db.collection('workers').updateOne({ _id: req.user._id }, { $set: { user_pw: req.body.new_pw1 } });
    res.clearCookie('connect.sid');
    res.send("<script>alert('변경 완료!');location.href='/login';</script>");
  }
});

function is_admin(req, res, next) {
  if (req.user.authority == 'admin') {
    next();
  } else {
    res.send("<script>alert('관리자 권한입니다.');location.href='/';</script>");
  }
}

app.get('/vacation_admin', is_admin, function (req, res) {
  db.collection('workers').findOne({ _id: req.user._id }, function (err, data) {
    if (String(req.user._id) == String(data._id)) {
      res.render('vacation-admin.ejs', { user: req.user });
    } else {
      res.send("<script>alert('관리자 권한입니다.');location.href='/';</script>");
    }
  });
});

app.get('/vacation-5', function (req, res) {
  if (String(req.user._id) == '641be3dde51413f24536fadf') {
    db.collection('vacation')
      .find()
      .toArray(function (err, data) {
        res.render('vacation-5.ejs', { user: req.user });
      });
  } else {
    res.send("<script>alert('관리자 권한입니다.');location.href='/';</script>");
  }
});

app.delete('/delete/vacation-5', function (req, res) {
  console.log(req.body.year);
  console.log(req.body.month);
  console.log(req.body.day);
  console.log(req.body.worker);
  req.body.year = parseInt(req.body.year);
  req.body.month = parseInt(req.body.month);
  req.body.day = parseInt(req.body.day);

  db.collection('vacation').deleteOne({ year: req.body.year, month: req.body.month, day: req.body.day, worker: req.body.worker }, function (err, data) {
    //휴가, 대근 갯수 조정
    db.collection('workers').updateOne({ _id: req.user._id }, { $inc: { vac_count: 1 }, function() {} });
  });
});
