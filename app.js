
//Express setup
var express = require('express');
var app = express();
var server = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
server.listen(2000); //server listening for changes at port 2000
console.log("Server started");

//Socket.io setup
var SOCKET_LIST = {};

var io = require('socket.io') (server, {});
//When new connection detected
io.sockets.on('connection', function(socket) {
    //Assign random id and add to list of sockets
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    //Update all users with new user info
    let pack = [];
    for(var i in SOCKET_LIST) {
        pack.push({id: SOCKET_LIST[i].id});
    }
    io.sockets.emit('newConnection', pack);

    //When connection disconnected, delete socket from list
    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
    })

    //Update users with names
    socket.on('newUser', function(data) {
        let userList = [];
        SOCKET_LIST[data.currSocket].name = data.name;
        for(var i in SOCKET_LIST) {
            if(SOCKET_LIST[i].name) {
                userList.push({name: SOCKET_LIST[i].name});
            }
        }
        console.log(userList);
        io.sockets.emit('updateUsers', userList);
    })
});
