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
var isFocused = true;
var newMessages = 0;
var standardTitle = '';

$(document).ready(function() {
    var localUsername = undefined;
    if (localStorage.userName === undefined) {
    } else {
        localUsername = localStorage.userName;
    }
    socket.emit('readyEvent', {
        name: localUsername
    });

    $('#formtext').val('').focus();
    standardTitle = document.title;

    setInterval(setIsFocused, 1000);
});

function setIsFocused() {
    isFocused = document.hasFocus();
}

$(document).focus(function() {
    $('#formtext').focus();
    if (newMessages > 0) {
        newMessages = 0;
        document.title = standardTitle;
    }
});

$(document).click(function(e) {
    $('#formtext').focus();
});

/*
$(window).on('beforeunload', function(){
    stopTyping();
});
*/

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
    var activePeople = '';
    var active = removeActiveSelf(data);
    var activeCount = active.length;
    var suffix = ' is typing...';

    if (activeCount > 0) {
        var i = 0;
        for (let client of active) {
            if (myId !== client.id) {
                if (i > 0) {
                    activePeople += ', ';
                }
                activePeople += client.name;
                i++;
            }
        }
        activePeople += suffix;
    }

    $('#messagetyping').html(activePeople);
});

function removeActiveSelf(data) {
    var users = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i].id !== myId) {
            users.push(data[i]);
        }
    }
    return users;
}

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
    var name = $(this).val().trim();
    socket.emit('nameEvent', {
        name:name
    });
    localStorage.userName = name;
});

$('#clientname').focus(function() {
   $(this).select();
});
$('#clientname').click(function(e) {
    e.stopPropagation();
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
    var className = data.type + 'message';

    var chat = $('#messages');
    chat.append('<div class="' + className + ' chatline">[' + data.timestamp + '] [' + data.name + '] ' + linkify(data.message) + ' </div>');

    $('#chat').scrollTop($('#chat')[0].scrollHeight);

    if (!isFocused && className === 'chatmessage') {
        newMessages++;
        document.title = standardTitle + ' (' + newMessages + ' new)';
    }
}

function displayUsers(users) {
    var userView = $('#usernames');
    userView.html('');
    for (let user of users) {
        userView.append(displayName(user));
    }
}

function displayName(user) {
    var dispName = user.id;
    if (user.name !== undefined && user.name !== '') {
        dispName = user.name;
    }

    if (user.id === myId) {
        return '<div class="myclient">' + dispName + '</div>';
    }
    return '<div class="otherclients">' + dispName + '</div>';
}

function linkify(inputText) {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    //URLs starting with http://, https://, or ftp://
    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    //Change email addresses to mailto:: links.
    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}