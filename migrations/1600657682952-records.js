'use strict'
const Bluebird = require('bluebird')
const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
Bluebird.promisifyAll(MongoClient)

let user = '';
let admin = '';
if (global.config.requiresUser) {

  if(!process.env.USERNAME && !process.env.PASSWORD){
    console.log(' USERNAME/PASSWORD not given in environment vars and required in config file, set requiresUser to false if not');
    exit(-1);
  }
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  admin = '?authSource=admin';
  user = `${username}:${password}@`;
}
let ssl = '';
if (global.config.ssl) {
  ssl = '?ssl=true';
  if(admin != '')admin = '&authSource=admin';
}
let host = global.config.host;
if(process.env.HOST) {
   host = process.env.HOST;
}
const sourceUrl = `mongodb://${user}${host}/${global.config.sourceMongodb}${ssl}${admin}`;
const targetUrl = `mongodb://${user}${host}/${global.config.targetMongodb}${ssl}${admin}`;

async function performUp() {
  let mClient = null
  let client = await MongoClient.connect(sourceUrl,{ useNewUrlParser: true })

  let targetClient = await MongoClient.connect(targetUrl,{ useNewUrlParser: true })
  let targetDb = targetClient.db();
  
  let db = client.db();

  const metadataDocuments = await db.collection('metadataDocuments');
  let results = await metadataDocuments.find({})
  let records = await results.toArray()
  
  for (let record of records) {
    let oid = record.redboxOid;

    let packageType = record.packageType[0];
    let dateObjectCreated =  record['date_object_created'][0];
    let dateObjectModified =  record['date_object_modified'][0];

    record.metaMetadata.packageType = packageType;
    record.metaMetadata.createdOn = dateObjectCreated;
    record.metaMetadata.lastSaveDate = dateObjectModified;
    record.lastSaveDate = dateObjectModified;
    record.dateCreated = dateObjectCreated;
    record.harvestId = oid;

    delete record.packageType
    delete record['date_object_created']
    delete record['date_object_modified']
    
    const targetRecordCollection = await targetDb.collection('record');
    let insertResult = await targetRecordCollection.insertOne(record);
    let recordMongoId = insertResult.ops[0]._id;
    
    const targetRecordAuditCollection = await targetDb.collection('recordAudit');
    let auditRecord = {
      date: dateObjectModified,
      recordId: recordMongoId,
      data: record
    }
    
    let auditRecordInsertResult = await targetRecordAuditCollection.insertOne(auditRecord);
    console.log( `Migrated Record with oid:  ${oid}`);
  }

  targetClient.close();
  client.close()
  return true;
}


module.exports.up = function (next) {
  performUp().then(result => {
    console.log("Migrated records to new database")
    next()
  });
}

module.exports.down = function (next) {
  next()
}
