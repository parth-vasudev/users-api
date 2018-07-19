var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var uuid = require('node-uuid');

var FullName = {
  firstName:{type:String},
  middleName:{type:String},
  lastName:{type:String},
  _id:false
};

var User = new Schema({
  name:{type:String, required:true},
  age:{type:String},
  birthDate:{type:Date},
  fullName:[FullName],
  updatedAt:{type:Date, default:Date.now},
  createdAt:{type:Date},
  id:{type:String, default:uuid}
},{versionKey:false});

var userSchemaModel = mongoose.model('user', User);

module.exports = userSchemaModel;
