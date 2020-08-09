const Deck = require('./helper/deck.js');

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
var roomList = [];

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
        for(var i in roomList) {
            //If disconnecting user was host of a room
            if(roomList[i].host == socket.id) {
                io.sockets.emit('kickFromRoom', {code: roomList[i].code});
                delete roomList[i];
            //If disconnecting user wasn't host of a room
            } else if(roomList[i].players.includes(socket.id)) {
                roomList[i].players.splice(roomList[i].players.indexOf(socket.id), 1);
                let name = SOCKET_LIST[socket.id].name;
                roomList[i].names.splice(roomList[i].names.indexOf(name), 1);
                io.sockets.emit('joinSuccess', {host: roomList[i].host, players: roomList[i].players, names: roomList[i].names});
            }
        }
        delete SOCKET_LIST[socket.id];
        //Regenerate userList without disconnected user info
        let userList = [];
        for(var i in SOCKET_LIST) {
            if(SOCKET_LIST[i].name) {
                userList.push({name: SOCKET_LIST[i].name});
            }
        }
        io.sockets.emit('updateUsers', userList);
    });

    //Update users with names
    socket.on('newUser', function(data) {
        let userList = [];
        SOCKET_LIST[data.currSocket].name = data.name;
        for(var i in SOCKET_LIST) {
            if(SOCKET_LIST[i].name) {
                userList.push({name: SOCKET_LIST[i].name});
            }
        }
        io.sockets.emit('updateUsers', userList);
    });

    //New room created
    socket.on('newRoom', function(data) {
        roomList.push(data);
    });

    //Joining existing room
    socket.on('joinRoom', function(data) {
        let codes = [];
        for(var i in roomList) {
            codes.push(roomList[i].code);
        }
        if(codes.includes(data.code)){
            for(var i in roomList) {
                if(roomList[i].code == data.code) {
                    roomList[i].players.push(data.player);
                    roomList[i].names.push(data.name);
                    io.sockets.emit('joinSuccess', {host: roomList[i].host, players: roomList[i].players, names: roomList[i].names});
                }
            }
        } else {
            io.sockets.emit('joinFail');
        }
    });
    
    //Game started
    socket.once('startGame', function(data) {
        let i = 0;
        //New deck for the game
        var deck = new Deck();
        deck.createDeck();
        deck.shuffle();

        var hands = [];
        let players = [];

        //Assign each player a number and deal each player a hand
        for(player in data.players) {
            SOCKET_LIST[data.players[player].socket].number = i;
            i++;
            SOCKET_LIST[data.players[player].socket].hand = deck.deal(7);
            hands.push(SOCKET_LIST[data.players[player].socket].hand);
            players.push({
                name: SOCKET_LIST[data.players[player].socket].name,
                socket: SOCKET_LIST[data.players[player].socket].id,
                number: SOCKET_LIST[data.players[player].socket].number,
                hand: SOCKET_LIST[data.players[player].socket].hand
            });
        }

        //Flip over card for the discard pile
        var discard = [];
        discard.push(deck.deal(1));
        io.sockets.emit('turn', {deck: deck, players: players, turn: 0});
    });

    //socket on 'play'
        //Logic for determining who's turn it is
        //Broadcast with data about who's turn it is bc apparently emitting to one client doesn't work
        //Probably have to keep track of what cards are in the discard and draw piles
        //Broadcast turn and top card in discard pile
});
