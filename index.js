//import the modules needed
var express = require ('express')
const session = require('express-session');
var ejs = require('ejs')
var bodyParser= require ('body-parser')
var mysql = require('mysql');
const crypto = require('crypto');

//generating secret key
const secretKey = crypto.randomBytes(32).toString('hex');

//Create the express application object
const app = express()
const port = 8000

app.set('baseUrl', 'https://www.doc.gold.ac.uk/usr/365');

app.use(session({
    secret: secretKey,
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 3 * 24 * 60 * 60 * 1000, //3 days in milliseconds
      },
}));

app.use(bodyParser.urlencoded({ extended: true }))


const db = mysql.createConnection ({
    host: 'localhost',
    user: 'appuser',
    password: 'app2027',
    database: 'forumApp'
});



//Connect to the database
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});
global.db = db;

//Set up css
app.use(express.static(__dirname + '/public'));

//Set the directory where Express will pick up HTML files
//__dirname will get the current directory
app.set('views', __dirname + '/views');

//Tell Express that we want to use EJS as the templating engine
app.set('view engine', 'ejs');

//Tells Express how we should process html files
//We want to use EJS's rendering engine
app.engine('html', ejs.renderFile);

//Define our data
var data = {appName: "Discussify"}

//Requires the main.js file inside the routes folder passing in the Express app and data as arguments.  All the routes will go in this file
require("./routes/main")(app, data);

//ensure that any requests to undefined routes are met with this not ofund page
app.use((req, res) => {
    let renderData = data;
    res.status(404).render('404.ejs', Object.assign({}, renderData, {sessionData:req.session}));
});


//Start the web app listening
app.listen(port, () => console.log(`${data.appName} listening on port ${port}!`))