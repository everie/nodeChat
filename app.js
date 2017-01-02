/**
 * Created by Hans on 23-10-2016.
 */
"use strict";
var express = require('express');
var app = express();

var http = require('http').createServer(app);
var fs = require('fs');
var io = require('socket.io').listen(http);
var BodyParser = require('body-parser');

var api = require('./api/mongo.js');

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(BodyParser.urlencoded({
    extended: true
}));
app.use(BodyParser.json());

app.use(api.routes);

var port = 3000;

var users = [];
var active = [];
//var log = [];

//var logSize = 50;

var standardName = 'Stranger';
var serverName = 'Server';
var nameIterator = 0;

app.get('/', function(req, res) {

    fs.readFile('./data/header.json', 'utf8', function(err, data) {
        res.render('index', JSON.parse(data));
    });

});
app.get('/*', function(req, res) {
    res.redirect('/');
});

http.listen(port, function() {
    console.log('listening on port ' + port);
});


io.on('connection', function(client) {

    // HANDLING DISCONNECTS
    client.on('disconnect', function(){
        //console.log('leaving: ' + client.id);
        announceUser(client, getUserByClientId(client.id), false);

        removeUser(client.id);
        //updateUsers(client);
        updateUsers2();
        cleanActive(client);
    });

    // WHEN CLIENT IS READY TO BE UPDATED
    client.on('readyEvent', function(data) {
        var userName = '';

        if (data.name === undefined) {
            nameIterator++;
            userName = standardName + ('00' + nameIterator).slice(-3);
        } else {
            userName = data.name;
        }

        // HANDLING CONNECTS
        var user = {
            id: client.id,
            name: userName
        };

        api.addUser({name: userName});

        users.push(user);

        // HANDLING CLIENT/SERVER COMMUNICATION
        emitName(client);

        /*
        for (let entry of log) {
            client.emit('chatEvent', entry);
        }
        */

        api.getLog(function(data) {
            for (let entry of data) {
                client.emit('chatEvent', entry);
            }
            client.emit('chatEvent', {type: 'server', timestamp: getTimestamp(), name: serverName, message: 'Welcome to nodeChat! There are currently ' + users.length + ' users online.'});
        });

        //updateUsers(client);
        updateUsers2();
        announceUser(client, user, true);
    });

    // FROM CLIENTS
    client.on('messageEvent', function(data) {
        var name = getName(client);
        var messageObj = {type: 'chat', timestamp: getTimestamp(), name: name, message: data.message};
        /*
        client.emit('chatEvent', messageObj);
        client.broadcast.emit('chatEvent', messageObj);
        */
        io.sockets.emit('chatEvent', messageObj);

        api.addHistory({type: 'log', timestamp: getTimestamp(), name: name, message: data.message});
        //updateLog({type: 'log', timestamp: getTimestamp(), name: name, message: data.message});
    });

    client.on('nameEvent', function(data) {
        var oldName = getName(client);
        changeClientName(client, data.name);
        emitName(client);
        //updateUsers(client);
        updateUsers2();
        var newName = data.name;
        if (newName.trim() === '') {
            newName = client.id;
        }
        api.addUser({name: newName});
        /*
        client.emit('chatEvent', {type: 'server', timestamp: getTimestamp(), name: serverName, message: oldName + ' changed name to ' + newName + '.'});
        client.broadcast.emit('chatEvent', {type: 'server', timestamp: getTimestamp(), name: serverName, message: oldName + ' changed name to ' + newName + '.'});
        */
        io.sockets.emit('chatEvent', {type: 'server', timestamp: getTimestamp(), name: serverName, message: oldName + ' changed name to ' + newName + '.'});
    });

    client.on('typeEvent', function(data) {
        if (data.typing) {
            active.push({
                id: client.id,
                name: getName(client)
            });
            cleanActive(client);
        } else {
            for (var i = 0; i < active.length; i++) {
                var id = active[i].id;
                if (id === client.id) {
                    active.splice(i, 1);
                    break;
                }
            }
        }

        /*
        client.emit('activeEvent', active);
        client.broadcast.emit('activeEvent', active);
        */
        io.sockets.emit('activeEvent', active);
    });

});

function cleanActive(client) {
    for (var i = 0; i < active.length; i++) {
        var user = active[i];
        if (user.name === 'gone' || userLeft(user)) {
            active.splice(i, 1);
        }
    }

    /*
    client.emit('activeEvent', active);
    client.broadcast.emit('activeEvent', active);
    */
    io.sockets.emit('activeEvent', active);
}

function userLeft(user) {
    for (let online of users) {
        if (online.id === user.id) {
            return false;
        }
    }
    return true;
}

function getName(client) {
    //console.log(client.id);
    return trimClientName(getUserByClientId(client.id));
}

/*
function updateLog(obj) {
    if (log.length > logSize) {
        log.pop();
    }
    log.push(obj);
}
*/

function emitName(client) {
    client.emit('clientName', {
        name: getName(client),
        id: client.id
    });
}

function getUserByClientId(clientId) {
    for (let client of users) {
        if (client.id === clientId) {
            return client;
        }
    }
    return {name: 'gone'};
}

function trimClientName(client) {
    if (client.name.trim() === '') {
        return client.id;
    }
    return client.name;
}

function changeClientName(client, name) {
    for (let user of users) {
        if (user.id === client.id) {
            user.name = name;
            break;
        }
    }
}

/*
function updateUsers(client) {
    client.broadcast.emit('usersEvent', {users: users});
    client.emit('usersEvent', {users: users});
}
*/

function updateUsers2() {
    io.sockets.emit('usersEvent', {users: users});
}

function announceUser(client, user, joined) {
    var joinLeave = "joined";
    if (!joined) {
        joinLeave = "left";
    }

    if (user.id !== undefined) {
        client.broadcast.emit('chatEvent', {
            type: 'server',
            timestamp: getTimestamp(),
            name: serverName,
            message: user.name + ' has ' + joinLeave + ' the chat.'
        });
    } else {
        console.log(getTimestamp() + ' withholding announce... name: ' + user.name + ', id: ' + client.id);
    }
}

function removeUser(clientId) {
    for (var i = 0; i < users.length; i++) {
        var client = users[i];
        if (client.id === clientId) {
            users.splice(i, 1);
            break;
        }
    }
    for (var i = 0; i < active.length; i++) {
        var user = active[i];
        if (user.id === clientId) {
            active.splice(i, 1);
            break;
        }
    }
}

function getTimestamp() {
    var time = new Date();
    var timestamp = ("0" + time.getHours()).slice(-2) + ":" +
        ("0" + time.getMinutes()).slice(-2) + ":" +
        ("0" + time.getSeconds()).slice(-2);
    return timestamp;
}