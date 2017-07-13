const express = require('express');
const session = require('express-session'); // handle the session authorization
const mongoClient = require('mongodb').MongoClient;
var route = express.Router();

// authentication  // router is like app?
route.use(session({
  secret: '2C44-4D44-100mealohasecretmather',
  resave: false,
  saveUninitialized: false/*,
  cookie: { maxAge: 60000 }*/ // 1 minutes are you kidding me?
}));

var sess;


// mongo client url
var url = 'mongodb://localhost:27017/account';

// body parser that handle the form data. Only need to save username password and gmail here to database and greet the user
route.post('/signup',(req,res)=>{
  var in_username = req.body.username;
  var in_email = req.body.email;
  var in_password = req.body.pass;
  mongoClient.connect(url,(e,db)=>{
    var collection = db.collection('users');
    collection.find({email:in_email}).toArray((err,docs)=>{  // db contain collections, collection comprise of docs document
      if(docs.length==0){
        collection.insertOne({username: in_username,email:in_email,password:in_password,poll:[]},(e,result)=>{
          if(e) throw e;
            res.redirect('/login');
            db.close();
        });
      }
        else{
          res.sendFile(__dirname + '/public/email exist.html');
          db.close();
        }
      });

    });
});

// handle login

route.post('/login',(req,res)=>{
  var in_email = req.body.email;
  var in_password = req.body.pass;
  mongoClient.connect(url,(e,db)=>{
    var collection = db.collection('users');
    collection.findOne({email:in_email, password:in_password}).then((doc)=>{  // db contain collections, collection comprise docs document
      if(doc==null){
        //res.send("error!! email does not exist or wrong password");
        res.sendFile(__dirname+"/public/error password.html");
      }
      else{
      sess = req.session;
      sess.email = req.body.email;
      sess.username = doc.username;
      sess.password = doc.password;
      //res.send("log in sucess" + doc);
      res.redirect('/dashboard');
    }
      db.close();
    });
  });
});

function requireLogin(req,res,next){
  if(req.session&&req.session.email){
    next();
  }
  else{
    res.redirect('/login');
  }
};


route.get('/dashboard',requireLogin,(req,res)=>{ // requireLogin is middleware for specific route
//  if(req.session && req.session.email){ // must check if the email exist in db or not, because session store in cookie, maybe other webpage has session also, and inside that session has email property
    /*console.log(JSON.stringify(req.session) + '\n');
    console.log(req.session.email);*/
    //res.sendFile(__dirname + '/public/dashboard.html');
    /*mongoClient.connect(url,(e,db)=>{
      var collection = db.collection('users');
      collection.findOne({email: req.body.email}).then((e,doc)=>{
        console.log(doc);
        //res.render('dashboard.ejs',{username: doc.username});
        db.close();
      })
    })*/
    mongoClient.connect(url,(e,db)=>{
      var col = db.collection('users');
      col.findOne({email: req.session.email}).then((doc)=>{
        res.render('dashboard.ejs',{username: doc.username});
        db.close();
      });
    });


  //}
/*  else{
    res.redirect('/login');
  }*/
});


route.get('/settings',requireLogin,(req,res)=>{
  //if(req.body.)
  //console.log(req.query);
  /*(req.params) Checks route params, ex: /user/:id

  (req.query) Checks query string params, ex: ?id=12 Checks urlencoded body params

  (req.body), ex: id=12 To utilize urlencoded request bodies, req.body should be an object. This can be done by using the _express.bodyParser middleware.*/
if(req.query.hasOwnProperty('currentPass')){
    if(req.session.password==req.query.currentPass){
      mongoClient.connect(url,(error,db)=>{
        var collection = db.collection('users');
        collection.findAndModify({email:req.session.email},[],{$set:{password:req.query.newPass}},{remove:false},(e,doc)=>{ // if remove :true. it find user, change the pass, then remove immediately the doc just modified. so it make no sense at all. that sucks
        //  console.log(doc);
          req.session.password=req.query.newPass;
        //  console.log(req.session.password);
          res.json({success:'Password has changed!'});
          db.close();
        });
      });
    }
    else if(req.session.password!=req.query.currentPass){
    //  console.log(req.session.password);
      res.json({error: 'incorrect password'});
    }


}
else{
  //res.render('settings.ejs',{username: req.session.username,incorrect:'',changePassSuccess:''}); // minh khong the render 2 lan lien tiep duoc, page no k refresh nen k nhan dc lan 2
  res.render('settings.ejs',{username: req.session.username});
};
});

route.post('/optiondata',requireLogin,(req,res)=>{
  //res.send(req.body);
  // open db, add optiondata and name
    // open db get previous poll data, push new data in

  mongoClient.connect(url,(e,db)=>{
    var data;
    var collection = db.collection('users');
    collection.findOne({email:req.session.email}).then((doc)=>{
      data = doc.poll;
      var str= req.body.title;
      // remove ? / : "" in the poll title
      var regex = /[^a-zA-Z0-9 ]/g;
      str=str.replace(regex,'');
      // remove white space at the end of the string if it has any
      if(str.search(/\s{1,}$/g)>0){
        str= str.substr(0,str.search(/\s{1,}$/g));// search return index
      }
      req.body.title=str;
      data.push(req.body);
      console.log(data);
      collection.findAndModify({email: req.session.email},[],{ $set: { poll : data} },{ // [poll] is field varible, mongo understand it as variable
          remove:false // upsert is defined as operation that "creates a new document when no document matches the query criteria"
        }).then((doc)=>{
        console.log("successfully updated poll to database!");
        var uri_reference = req.body.title.replace(/ {1,}/g,''); // 1 or more space is remove from req.body.title
        res.json({url: req.protocol + '://' +req.get('host')+'/'+req.session.username +'/' + uri_reference});
        db.close();
      });
    });

  });
});

// get my poll
route.get('/mypoll',requireLogin,(req,res)=>{
  mongoClient.connect(url,(e,db)=>{
    var data;
    var collection = db.collection('users');
    collection.findOne({email:req.session.email}).then((doc)=>{
      data = doc.poll;
      res.json(data);
      db.close();
    });
  });
});


// detele poll

route.delete('/:poll',requireLogin,(req,res)=>{
  console.log("poll that delete");
  console.log(req.params.poll);
    mongoClient.connect(url,(err,db)=>{
      var col = db.collection('users');
      col.findOne({email:req.session.email}).then((doc)=>{
            var pollData = doc.poll;

            var newPollData = pollData.filter(function(val,index){ return val.title != req.params.poll});
            col.findAndModify({email:req.session.email},[],{$set:{ poll: newPollData}},{remove:false}).then((doc)=>{
              console.log("successfully deleted poll!");
              res.json({message:"successfully deleted poll!"});
              db.close();
            })
      })
    });
});


// vote route
route.get('/:username/:poll_title',(req,res)=>{ // have problem if it has 2 similar username and poll name
  mongoClient.connect(url,(e,db)=>{})
})




route.get('/logout',(req,res)=>{
    req.session.destroy((e)=>{
      if(e) console.log(err);
      else res.redirect('/');
    });
});


module.exports = {
  router:route
};
