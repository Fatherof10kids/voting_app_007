const express = require('express');
const route = require('./route.js');
const bodyParser = require('body-parser');
const ejs = require('ejs');

var app = express();

var port = process.env.PORT || 5000;


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


// body parser get the form data that POST to server
app.use(bodyParser.urlencoded({extended:true}));




// router middleware, chop down routes
app.use(route.router); // here is global middleware


app. get('/',(req,res)=>{
  if(req.session && req.session.email) // in real application must check if it match email or password in database
  res.redirect('/dashboard');
  else
  res.sendFile(__dirname+'/public/index.html');
});

app.get('/login',(req,res)=>{
  res.sendFile(__dirname+'/public/login.html');
})


app.listen(port, console.log("Server is listen to port"+port));
