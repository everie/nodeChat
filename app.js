/**
 * Created by Hans on 23-10-2016.
 */
"use strict";
var express = require('express');
var app = express();

var http = require('http').createServer(app);
var fs = require('fs');
var io = require('socket.io').listen(http);

app.set('view engine', 'ejs');
app.use(express.static('public'));

var port = 3000;

var users = [];
var active = [];

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
        removeUser(client.id);
        updateUsers(client);
        announceUser(client, user, false);
    });

    nameIterator++;

    // HANDLING CONNECTS
    var user = {
      id: client.id,
      name: 'noob' + nameIterator
    };

    users.push(user);

    // HANDLING CLIENT/SERVER COMMUNICATION
    emitName(client);

    client.emit('chatEvent', {name: 'Server', message: 'Welcome to nodeChat! There are currently ' + users.length + ' users online.'});

    // FROM CLIENTS
    client.on('messageEvent', function(data) {
        client.emit('chatEvent', {name: getNameFromClientId(client.id), message: data.message});
        client.broadcast.emit('chatEvent', {name: getNameFromClientId(client.id), message: data.message});
    });

    client.on('nameEvent', function(data) {
        var oldName = getNameFromClientId(client.id);
        changeClientName(client, data.name);
        emitName(client);
        updateUsers(client);
        var newName = data.name;
        if (newName.trim() === '') {
            newName = client.id;
        }
        client.emit('chatEvent', {name: 'Server', message: oldName + ' changed name to ' + newName + '.'});
        client.broadcast.emit('chatEvent', {name: 'Server', message: oldName + ' changed name to ' + newName + '.'});
    });

    client.on('typeEvent', function(data) {
        if (data.typing) {
            active.push(client.id);
        } else {
            for (var i = 0; i < active.length; i++) {
                var id = active[i];
                if (id === client.id) {
                    active.splice(i, 1);
                    break;
                }
            }
        }

        announceUsersTyping(client);
    });

    updateUsers(client);
    announceUser(client, user, true);

});

function announceUsersTyping(client) {
    var activePeople = '';
    var activeCount = active.length;
    if (activeCount > 0) {
        for (var i = 0; i < activeCount; i++) {
            if (i > 0) {
                activePeople += ', ';
            }
            activePeople += getNameFromClientId(active[i]);
        }
        activePeople += ' is typing...';
    }
    client.emit('activeEvent', activePeople);
    client.broadcast.emit('activeEvent', activePeople);
}

function emitName(client) {
    client.emit('clientName', {
        name: getNameFromClientId(client.id),
        id: client.id
    });
}

function getNameFromClientId(clientId) {
    for (let client of users) {
        if (client.id === clientId) {
            if (client.name.trim() === '') {
                return client.id;
            }
            return client.name;
        }
    }
}

function changeClientName(client, name) {
    for (let user of users) {
        if (user.id === client.id) {
            user.name = name;
            break;
        }
    }
}

function updateUsers(client) {
    client.broadcast.emit('usersEvent', {users: users});
    client.emit('usersEvent', {users: users});
}

function announceUser(client, user, joined) {
    var joinLeave = "joined";
    if (!joined) {
        joinLeave = "left";
    }

    client.broadcast.emit('chatEvent', {name: 'Server', message: 'User ' + user.name + ' has ' + joinLeave + " the chat."});
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
        var userId = active[i];
        if (userId === clientId) {
            active.splice(i, 1);
            break;
        }
    }
}