/**
 * Created by Hans on 23-10-2016.
 */
"use strict";
var socket = io();
var myName = '';
var myId = '';
var typingTimer = undefined;
var typingTimeout = 3000;
var isTyping = false;

socket.on('usersEvent', function(data) {
    displayUsers(data.users);
});

socket.on('chatEvent', function(data) {
    displayMessage(data);
});

socket.on('clientName', function(data) {
    var field = $('#clientname');
    field.val(data.name);
    field.attr('placeholder', data.id);
    myName = data.name;
    myId = data.id;
});

socket.on('activeEvent', function(data) {
   $('#messagetyping').html(data);
});

$(document).ready(function() {
    $('#formtext').val('').focus();
    console.log('init nodeChat.');
});

$('#formtext').keypress(function(event) {

    switch (event.key) {
        case "Enter":
            sendMessage();
            break;
        default:
            emitTyping();
            break;
    }
});
$('#formsend').click(function () {
    sendMessage();
});

$('#clientname').change(function() {
    var name = $(this).val();
    socket.emit('nameEvent', {
        name:name.trim()
    });
});

$('#clientname').focus(function() {
   $(this).select();
});

function emitTyping() {
    if (!isTyping) {
        isTyping = true;
        socket.emit('typeEvent', {typing: true});
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, typingTimeout);
}

function stopTyping() {
    isTyping = false;
    clearTimeout(typingTimer);
    socket.emit('typeEvent', {typing: false});
}

function sendMessage() {
    var field = $('#formtext');
    if (field.val().trim() !== '') {
        socket.emit('messageEvent', {
            message:field.val().trim()
        });
    }
    field.val('');
    stopTyping();
}

function displayMessage(data) {
    var time = new Date();
    var timestamp = ("0" + time.getHours()).slice(-2)   + ":" +
        ("0" + time.getMinutes()).slice(-2) + ":" +
        ("0" + time.getSeconds()).slice(-2);

    var className = 'chatmessage';

    if (data.name === 'Server') {
        className = 'servermessage';
    }

    var chat = $('#messages');
    chat.append('<div class="' + className + ' chatline">[' + timestamp + '] [' + data.name + '] ' + data.message + ' </div>');

    $('#chat').scrollTop($('#chat')[0].scrollHeight);

}

function displayUsers(users) {
    var userView = $('#usernames');
    userView.html('');
    for (let user of users) {
        userView.append('<div>' + displayName(user) + '</div>');
    }
}

function displayName(user) {
    var dispName = user.id;
    if (user.name !== undefined && user.name !== '') {
        dispName = user.name;
    }
    if (dispName === myName || dispName === myId) {
        return '<b>' + dispName + '</b>';
    }
    return dispName;
}