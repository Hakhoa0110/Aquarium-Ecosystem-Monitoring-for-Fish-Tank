var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

var firebase = require('firebase');
const mqtt = require('mqtt');
var dateTime = require('node-datetime');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const firebaseConfig = {
  apiKey: "AIzaSyDzO4IKWeGpOXfFUajUVAZleNMK6JY3PUU",
  authDomain: "crab-farming.firebaseapp.com",
  databaseURL: "https://crab-farming-default-rtdb.firebaseio.com",
  projectId: "crab-farming",
  storageBucket: "crab-farming.appspot.com",
  messagingSenderId: "257536136518",
  appId: "1:257536136518:web:fe67d0563b35785a9ec147",
  measurementId: "G-137YLVN79Y"
};


firebase.initializeApp(firebaseConfig);

// MQTT set up parameters
const topic = "CrabIndoorFarming";

const Broker_URL = 'mqtt://broker.hivemq.com';

const options = {
    clientId: 'BrokerHiveMQ',
    username: '',
    password: '',
    port: 1883,
    keepalive: 60
};

var pushItself = true;

const client = mqtt.connect(Broker_URL, options);

let database = firebase.database();

let controller = {
    condition: "good condition",
    controlState: "auto",
    ph: "0",
    pumper1: "0",
    pumper2: "1",
    temperature: "30",
}

// Connect to MQTT server and subcribe to topic = "CrabIndoorFarming" 
client.on('connect', () => {
    client.subscribe(topic);
});

client.on('message', (topic, message) => {
    try {
        var parse = JSON.parse(message);
    } catch (error) {
        console.log(error);
    }

    if (parse != null) {
        controller.condition = parse.condition;
        controller.controlState = parse.controlState;
        controller.ph = parse.ph;
        controller.pumper1 = parse.pumper1;
        controller.pumper2 = parse.pumper2;
        controller.temperature = parse.temperature;
    }

    var dt = dateTime.create();
    var formatted = dt.format('Y-m-d/H:M:S');

    pushItself = true;
    database.ref("controller").child(formatted).set(controller);
    console.log("Push date time: " + formatted);
});

// Capture event when child has been changed 
database.ref('controller').orderByKey().limitToLast(1).on('value', (snapshot) => {
    console.log("Data change...");
    if (pushItself) {
        pushItself = false;
        return;
    }

    var dateTime = null;

    snapshot.forEach(element => {
        dateTime = element;
    });

    if (dateTime == null) {
        console.log("dateTime null");
        return;
    }

    var lastData = null;

    dateTime.forEach(element => {
        lastData = element;
    });

    if (lastData == null) {
        console.log("lastData null");
        return;
    }

    var data = JSON.stringify(lastData.val());
    console.log("My data: " + data);
    client.publish("gateway-listen", data); //topic esp
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;