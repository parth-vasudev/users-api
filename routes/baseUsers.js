var express = require('express'),
app = express(),
userSchemaModel = require('../models/user'),
mongoose = require('mongoose'),
hal = require('hal'),
config = require('../config/config'),
nconf = require('nconf'),
packageFile = require('../package'),
util = require("util"),
Qs = require('qs');
uuid = require('node-uuid');

//a middlware (functionality) that will get executed for every request issued to this router. This returns the request URL.
app.use(function(req, res, next) {
  req.getUrl = function() {
    return config.BASE_URL+":"+config.PORT+req.originalUrl;
    }
    return next();
  });

//a middlware (functionality) that will get executed for every request issued to this app.This validates fields of the request body.
app.use(function(req, res, next) {
  req.validateforEmpty = function() {

    if(req.body.name == "")
        return res.status(400).json({message:"A user name cannot be empty."});
    else if(req.body.age.toString() == "")
        return res.status(400).json({message:"A user age has to be set."});
    else if(req.body.birthDate.toString() == "")
        return res.status(400).json({message:"A user birthDate has to be set."});
    else if(req.body.fullName == "")
      return res.status(400).json({message:"A user has to have a FullName."});
    else if(req.body.fullName.firstName == "")
      res.status(400).json({message:"User's fullName must have a firstName."});
      else if(req.body.fullName.lastName == "")
        res.status(400).json({message:"User's fullName must have a lastName."});
    else
      return false;
    }
    return next();
  });


//a middlware (functionality) that will get executed for every request issued to this app.This validates fields of the request body.
app.use(function(req, res, next) {
  req.validateforNull = function() {

    if(req.body.fullName == null)
      return res.status(400).json({message:"User's fullName cannot be null."});

    if(req.body.fullName.length > 0){
      for(var i in req.body.fullName){
        if(req.body.fullName[i].firstName == null)
          return res.status(400).json({message:"User's firstName cannot be null."});
        }
    }else if (req.body.fullName.firstName == null)
      return res.status(400).json({message:"User's firstName cannot be null."});

    if(req.body.name == null)
      res.status(400).json({message:"User name cannot be null."});
    else if(req.body.age == null)
      res.status(400).json({message:"User 'age' property cannot be null."});
    else if(req.body.birthDate == null)
      res.status(400).json({message:"User 'birthDate' property cannot be null."});
    else
      return false;
    }
    return next();
  });

/*Health Route*/
app.get('/health', function(req, res){

  console.log("MONGO_HOST : "+config.MONGO_HOST);

  if(mongoose.connection.readyState == 1){
    // HAL linking the resource. This requires creation of a new Resource object to link to.
    var user_hal = new hal.Resource({
      health: "HEALTHY",
      version: packageFile.version,
      name: "Users API"
    }, req.getUrl());

    res.status(200).send(user_hal);
  }else{
    console.log("Could not connect to Mongo DB. "+e);
    res.status(400).json({message:"UNHEALTHY",data:"Could not connect to the database."}).end();
  }
});


/*POST : Create the user. */
app.post('/users', function(req,res){
  console.log(req.body);

    if(req.validateforNull() == false &&  req.validateforEmpty() == false) {

      var userName = req.body.name,
      userAge = req.body.age,
      userBirthDate = req.body.birthDate,
      userFullName = req.body.fullName;

      var user;

      user = new userSchemaModel({
        name: userName,
        age: userAge,
        birthDate: userBirthDate,
        fullName: userFullName,
        createdAt: new Date()
      });

      user.fullName.push(userFullName);

      user.save(function(err){
        if(!err){

          //Deleting the mongoose id from the response.
          user = user.toObject();
          delete user["_id"];

          //HAL linking the resource. This requires creation of a new Resource object to link to.
          var user_hal = new hal.Resource({
            id: user.id,
            name: userName,
            age: userAge,
            birthDate: userBirthDate,
            fullName: userFullName,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }, req.getUrl()+"/"+user.id);

          res.location(req.getUrl()+"/"+user.id);
          res.status(201).send(user_hal)+"/"+user.id;
      } else {
        if(req.validateforNull() == false){
          console.log(err);
          res.status(400).json({message:"The user cannot be saved. : "+err});
        }
      }
    });
  }
});

/*GET : Read/fetch a single user by userId. */
app.get('/users/:id', function(req, res) {
  console.log(req.params.id);

  var userId = req.params.id;

  userSchemaModel.findOne({'id':userId},{ _id: 0},function(err, user){
    if(!err){
      if((user != null) && (userId == user.id))
        {
          console.log(user);

          //Deleting the mongoose id from the response.
          user = user.toObject();
          if(user.fullName.length > 1)
            user["fullName"].splice(user.fullName.length - 1,1);

          //HAL linking the resource. This requires creation of a new Resource object to link to.
          var user_hal = new hal.Resource({
          id: user.id,
          name: user.name,
          age: user.age,
          birthDate: user.birthDate,
          fullName: user.fullName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }, req.getUrl());
          res.status(200).send(user_hal);
        }else{
          console.log(err);
          res.status(404).json({message:"No User with matching id."});
        }
    }else{
      console.log(err);
      res.status(404);
    }
  });
});

/*LIST routes */
/*GET : Read all users.*/
app.get('/users', function(req, res) {

  console.log("URL : "+req.url);

  if((req.url.toString().indexOf('filter') === -1) || (req.url.toString().indexOf('::') === -1))
    res.status(404).json({message:"Filter routes require to start with 'filter' keyword followed by a '::' ."}).end();
  else {
    //Splitting the url into 2 parts
    var splitUrl = req.url.split("::",2),

    //Extracting the filter portion of the url from the split url.
    filterUrl = splitUrl[1],

    filterPart = null,
    filterComponent = null,
    filterSizeComponent = null,
    limit = null,
    offset = null,
    total = 0,
    daysBack = null,
    currentDate = new Date();

    //A dummy object used in key:value substitution for mongoose.
    var searchKey = {};

    //Separating the filter components if the url has count limiters separated by '&'
    if(filterUrl.indexOf('&') > -1){
      filterPart = filterUrl.split("&");
      console.log("Filter Parts : "+filterPart);

      filterSizeComponent = filterPart.toString().substr(filterPart[0].length + 1);
      console.log("Filter Size Params : "+filterSizeComponent);

      if((filterUrl.match(/|/)||[]).length == 0){
        filterComponent = filterPart[0].toString();
        console.log("Filter Components : "+filterComponent);
      }else {
        filterComponent = filterPart[0].toString().split("|");
        console.log("Filter Components : "+filterComponent);
      }

      //Fetching the filter size components.(limit and offset)
      var parsedFilterSizeObject = Qs.parse(filterSizeComponent, {delimiter: /[,]/ });
      if(filterSizeComponent.indexOf("limit") > -1 | filterSizeComponent.indexOf("offset") > -1 | filterSizeComponent.indexOf("daysBack") > -1){
        for(var i in parsedFilterSizeObject){
          if(i == "limit")
            limit = parsedFilterSizeObject[i];
          if(i == "offset")
            offset = parsedFilterSizeObject[i];
          if(i == "daysback"){
            //Essentially, we are computing how many days back do we want to go to fetch the data as given in the filter params' 'days' value.
            daysBack = parsedFilterSizeObject[i];
            currentDate.setDate(currentDate.getDate()-daysBack);
            console.log("FETCH AFTER DATE : "+currentDate.toISOString());
            searchKey["createdAt"] = {$gte: new Date(currentDate.toISOString())};
          }
        }
      }
    }
    //Separating the filter components if there are multiple filters being requested.
    else if(filterUrl.indexOf('|') > -1){
      filterComponent = filterUrl.split("|");
      console.log("Filter Components : "+filterComponent);
    }else{
      filterComponent = filterUrl;
    }

    //Parsing the filter components to a key:vaue paired object.
    var parsedFilterObject = Qs.parse(filterComponent.toString(), {delimiter: /[,|]/ });
    console.log("PARSED FILTER OBJECT : "+util.inspect(parsedFilterObject, false, null));

    //Traversing through the user schema model to search for a match on the requested filter key.
    userSchemaModel.schema.eachPath(function(path) {
    for(var key in parsedFilterObject){
      var value = parsedFilterObject[key];

      if(path.indexOf(key) > -1){
        console.log("FOUND MATCH : REQUESTED FILTER KEY : "+key+" , KEY in SCHEMA MODEL : "+path);
        //Since a match was found, preparing the dummy object for mongoose query.
        searchKey[path] = value;
      }
    }
    });

    //Searching through the db for records with appropriate matching filters.
    userSchemaModel.find(searchKey, function(err, users){
      if(!err){
        var userCollection = new hal.Resource({}, req.getUrl());

        if(limit !== null && offset !== null){
          offset = offset - 0;
          limit  = limit - 0;
        }

        if(limit == null | (offset+limit) > users.length | limit < 0)
          limit = users.length;

        if(offset == null | offset > users.length | offset < 0)
          offset = 0;

        if((offset+limit) > users.length)
          total = users.length;
        else
          total = offset+limit;

        for(var i = offset; i < total; i++){

          var user = users[i].toObject();

          //Deleting the mongoose id from the response.
          if(user.fullName.length > 1)
            user["fullName"].splice(user.fullName.length - 1,1);

          //HAL linking the resource. This requires creation of a new Resource object to link to.
          var user_hal = new hal.Resource({
            id: user.id,
            name: user.name,
            age: user.age,
            birthDate: user.birthDate,
            fullName: user.fullName,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }, config.BASE_URL+":"+config.PORT+"/users/"+user.id);
          userCollection.embed("users",[user_hal]);
        }
        res.status(200).send(userCollection);
      }else{
        console.log(err);
        res.status(204);
      }
    });
  }
});

/*PUT : Update the user info based on a search for the user id. */
app.put('/users/:id', function(req,res) {
  console.log(req.params.id);

  if(req.validateforNull() == false && req.validateforEmpty() == false) {

    var userId = req.params.id,
    userName = req.body.name,
    userAge = req.body.age,
    userBirthDate = req.body.birthDate,
    userFullName = req.body.fullName;

    return userSchemaModel.findOne({'id':userId}, function(err,user){

    var fullName = util.inspect(userFullName, false, null);

    if(user == null) {
      res.status(400).json({message:"Such a record does not exist."}).end();
    }
    else if(user.name == userName && (JSON.stringify(fullName) == JSON.stringify(user.fullName)) && user.age == userAge && user.birthDate == userBirthDate)
      res.status(409).json({message:"A user with this data already exists."}).end();
      else {
        user.name = userName,
        user.age = userAge,
        user.birthDate = userBirthDate,
        user.fullName.splice(0,user.fullName.length),
        user.fullName = userFullName;

        user.fullName.push(userFullName);

        return user.save(function(err){
          if(!err){

            //Deleting the mongoose id from the response.
            user = user.toObject();
            delete user["_id"];

            console.log(user);

            //HAL linking the resource. This requires creation of a new Resource object to link to.
            var user_hal = new hal.Resource({
              id: user.id,
              name: userName,
              age: userAge,
              birthDate: userBirthDate,
              fullName: userFullName,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            }, req.getUrl());

            res.location(req.getUrl()+"/"+user.id);
            res.status(200).send(user_hal)+"/"+user.id;
          } else {
            console.log("Error : "+err);
            res.status(400).json({message:"The user cannot be updated. "});
        }
      });
    }
  });
}
});

/*DELETE the user by userId*/
app.delete('/users/:id', function(req,res){
  console.log(req.params.id);

  var userId = req.params.id;

  return userSchemaModel.findOne({'id':userId}, function(err, user){
    if(user!=null && (userId == user.id)){
      return user.remove(function(err){
        if(!err){
          console.log(user);
          res.status(204).end();
        }else{
          console.log(err);
        }
      });
    } else {
      console.log(err);
      res.status(404).send(req.getUrl()).end();
    }
  });
});

module.exports = app;
