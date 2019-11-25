let { ref } = require('worker_threads');

let MongoClients = Java_type('com.mongodb.client.MongoClients')
let Document = Java_type('org.bson.Document')

// console.log('Database:', database);
// let collection =
// console.log('collection:', collection);

let java_objects = new WeakMap();

export class MongoClient {
  constructor(uri) {
    let client = MongoClients.static.create(uri);
    java_objects.set(this, client);
    ref(client);
  }

  db(name) {
    let java_database = java_objects.get(this).getDatabase(name);
    return new MongoDatabase(java_database);
  }
}

class MongoDatabase {
  constructor(java_database) {
    java_objects.set(this, java_database);
  }

  collection(name) {
    let java_collection = java_objects.get(this).getCollection(name);
    return new MongoCollection(java_collection);
  }

  /*
  To Create a User
  {
    createUser: 'dev',
    pwd: 'password123',
    roles: Java.to(['readWrite']),
  }

  To Create a User
  {
    dropUser: 'dev',
  }
  */
  runCommand(command) {
    let db = java_objects.get(this);

    let BasicDBObject = Java_type('com.mongodb.BasicDBObject');
    let java_command = new BasicDBObject(command);
    db.runCommand(java_command);
  }
}

class MongoCollection {
  constructor(java_collection) {
    java_objects.set(this, java_collection);
  }

  find(query) {
    let iterator = java_objects.get(this).find(new Document(query)).iterator()
    let list = [];
    iterator.forEachRemaining(x => list.push(x));
    list = list.map(x => JSON.parse(x.toJson()));

    return {
      toArray() {
        return list;
      }
    }
  }

  findOne(query) {
    let document = java_objects.get(this).find(new Document(query)).first()
    return JSON.parse(document && document.toJson());
  }

  insert(json_document) {
    java_objects.get(this).insertOne(new Document(json_document))
  }

  updateOne(query, mutation) {
    java_objects.get(this).updateOne(new Document(query), new Document(mutation))
  }
}

class MongoCursor {
  constructor() {

  }
}
