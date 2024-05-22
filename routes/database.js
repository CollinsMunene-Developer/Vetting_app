const { MongoClient } = require('mongodb');
require('dotenv').config();

let db;
async function connectToDatabase (){
    try{
        const client = await MongoClient.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

         console.log('connected to MongoDB');
         db = client.db();

    }catch(error){
        console.log('Error Connecting to the MongoDB');
        throw error;
    }
}
 
  function getDatabase(){
    if(!db){
        throw new Error('Database not Connected');
    }
    return db;
  }
  module.exports = {connectToDatabase, getDatabase};