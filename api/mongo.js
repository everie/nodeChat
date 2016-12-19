var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var settings = require('./settings.js');

function adminFilter(user) {
    if (user !== 'admin') {
        return {_id:0, type:0};
    } else {
        return {};
    }
}

// SHOW ALL
app.get('/history', function(req, res) {

    MongoClient.connect(settings.mongodb, function(err, db) {

        var collection = db.collection(settings.history);

        /*
        if (req.headers.user !== 'admin') {
            filters = {_id:0, type:0};
        } else {
            filters = {};
        }
        */

        //console.log(req.headers.user);

        collection.find({}, adminFilter(req.headers.user)).toArray(function(err, data) {

            res.send(data);
            db.close();
        });
    });
});

app.get('/users', function(req, res) {

    MongoClient.connect(settings.mongodb, function(err, db) {

        var collection = db.collection(settings.users);

        collection.find({}, adminFilter(req.headers.user)).toArray(function(err, data) {

            res.send(data);
            db.close();
        });
    });
});

app.get('/users/top', function(req, res) {

    MongoClient.connect(settings.mongodb, function(err, db) {

        var collection = db.collection(settings.users);

        collection.find({}, adminFilter(req.headers.user)).sort({messages:-1}).toArray(function(err, data) {

            res.send(data);
            db.close();
        });
    });
});
// SHOW ALL END

// SHOW SINGLE USER

app.get('/users/:name', function(req, res) {

    MongoClient.connect(settings.mongodb, function(err, db) {

        if (err) {
            res.status(500);
            res.send({ "msg": "Internal Server Error." });
            db.close();
            return;
        }

        var collection = db.collection(settings.users);

        collection.findOne({ 'name': new RegExp('^' + req.params.name, 'i') }, adminFilter(req.headers.user), function(err, data) {

            if (data === null) {
                res.status(404);
                res.send({ "msg": "User not found." });
            } else {
                res.send(data);
            }

            db.close();
        });
    });

});

app.get('/history/:name', function(req, res) {

    MongoClient.connect(settings.mongodb, function(err, db) {

        if (err) {
            res.status(500);
            res.send({ "msg": "Internal Server Error." });
            db.close();
            return;
        }

        var collection = db.collection(settings.history);

        collection.find({ 'name': new RegExp('^' + req.params.name, 'i') }, adminFilter(req.headers.user)).toArray(function(err, data) {

            if (data === null) {
                res.status(404);
                res.send({ "msg": "Log entry not found." });
            } else {
                res.send(data);
            }

            db.close();
        });
    });

});

app.delete('/users/:id', function(req, res) {

    if ((req.params.id.length === 12 || req.params.id.length === 24) && req.headers.user === 'admin') {
        MongoClient.connect(settings.mongodb, function (err, db) {

            var collection = db.collection(settings.users);

            collection.deleteOne({ '_id': ObjectId(req.params.id) }, function (err, data) {

                res.send({'msg': 'User deleted.'});
                db.close();
            });
        });
    } else {
        res.status(400);
        res.send({'msg' : '400 Bad request.'});
    }
});
app.delete('/history/:id', function(req, res) {

    if ((req.params.id.length === 12 || req.params.id.length === 24) && req.headers.user === 'admin') {
        MongoClient.connect(settings.mongodb, function (err, db) {

            var collection = db.collection(settings.history);

            collection.deleteOne({ '_id': ObjectId(req.params.id) }, function (err, data) {

                res.send({'msg': 'Log entry deleted.'});
                db.close();
            });
        });
    } else {
        res.status(400);
        res.send({'msg' : '400 Bad request.'});
    }
});

// INTERNAL METHODS

var addHistory = function(data) {
    MongoClient.connect(settings.mongodb, function(err, db) {

        var collection = db.collection(settings.history);

        collection.insert(data, function(err, data) {
            //db.close();
        });

        var collection2 = db.collection(settings.users);
        collection2.updateOne({'name':data.name}, {$inc: {'messages' : 1}});
    });
};
var addUser = function(data) {
    MongoClient.connect(settings.mongodb, function(err, db) {

        var collection = db.collection(settings.users);

        collection.findOne({'name':data.name}, function(err, user){
            if (!user) {

                var newUser = {
                    'name': data.name,
                    'visits': 1,
                    'messages': 0
                };

                collection.insert(newUser, function(err, user) {
                    db.close();
                });
            } else {
                //console.log(user);
                collection.updateOne({'name': user.name}, {$inc: {'visits' : 1}}, function(err, msg) {
                    db.close();
                });

            }
        });
    });
};
var getLog = function(callback) {
    MongoClient.connect(settings.mongodb, function(err, db) {

        var collection = db.collection(settings.history);

        collection.find({}).toArray(function(err, data) {
            return callback(data);
        });
    });
};


module.exports = {
    routes: app,
    addHistory: addHistory,
    addUser: addUser,
    getLog: getLog
};