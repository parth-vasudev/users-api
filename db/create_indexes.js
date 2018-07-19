//add indexes to Users tables
db.users.ensureIndex({"createdAt":1,"name":1})
