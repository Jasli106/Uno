const Deck = require('./helper/deck.js');

//Express setup
var express = require('express');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
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
    for(let i in SOCKET_LIST) {
        pack.push({id: SOCKET_LIST[i].id});
    }
    io.sockets.emit('newConnection', pack);

    //When connection disconnected, delete socket from list
    socket.on('disconnect', function() {
        for(let i in roomList) {
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
        for(let i in SOCKET_LIST) {
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
        for(let i in SOCKET_LIST) {
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
        for(let i in roomList) {
            codes.push(roomList[i].code);
        }
        if(codes.includes(data.code)){
            for(let i in roomList) {
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
    socket.on('startGame', function(data) {
        let gameSetup = new Promise(function(resolve, reject) {
            let i = 0;
            //New deck for the game
            let deck = new Deck();
            deck.createDeck();
            deck.shuffle();
    
            //Flip over card for the discard pile
            let discard = [];
            discard.push(deck.deal(1)[0]);
    
            //Assign each player a number and deal each player a hand
            let hands = [];
            let players = [];
    
            for(let player in data.players) {
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
    
            if(discard.length != 0 && players.length != 0) {
                resolve({code: data.code, deck: deck, discard: discard, hands: hands, players: players});
            } else {
                reject(new Error("Data was not retrieved"));
            }
        });


        gameSetup.then(function(data) {
            //Store deck, discard pile, player hands, and current turn for this room
            for(let i in roomList) {
                if(roomList[i].code == data.code) {
                    roomList[i].deck = data.deck;
                    roomList[i].discard = data.discard;
                    roomList[i].hands = data.hands;
                    roomList[i].players = data.players;
                    roomList[i].turn = 0;
                }
            }
            io.sockets.emit('turn', {top: data.discard[0], players: data.players, turn: 0, turnAdd: turnAdd});
        })
        .catch(function(error) {
            console.log(error.message);
        })

    });


    let turnAdd = 1;
    let drawCards = 0;
    let drawTwo = false;

    //Player draws a card
    socket.on('drawCard', function(data) {
        turnAdd = data.turnAdd;
        let deck, card, discard, players, turn;
        //Update player info
        for(let i in SOCKET_LIST) {
            if(SOCKET_LIST[i].id == data.socket) {
                //Update room info
                for(let i in roomList) {
                    if(roomList[i].code == data.room) {
                        deck = roomList[i].deck;
                        discard = roomList[i].discard;
                        players = roomList[i].players;
                        cards = deck.deal(data.numCards);
                        roomList[i].deck = deck;
                        for(card in cards) {
                            roomList[i].hands[roomList[i].turn].push(cards[card]);
                        }
                        //Update turn
                        roomList[i].turn += turnAdd;
                        if(roomList[i].turn > roomList[i].players.length - 1 && turnAdd > 0) {
                            roomList[i].turn = Math.abs(roomList[i].players.length - roomList[i].turn);
                        } else if(roomList[i].turn < 0 && turnAdd < 0) {
                            roomList[i].turn = roomList[i].players.length + roomList[i].turn;
                        }
                        turn = roomList[i].turn;
                        //Reset if skipped
                        if(turnAdd == 2 || turnAdd == -2) {
                            turnAdd = turnAdd/2;
                        }
                    }
                }
            }
        }
        io.sockets.emit('turn', {top: discard[discard.length - 1], players: players, turn: turn, turnAdd: turnAdd});
    });
        
    //Validating if a card can be played
    socket.on('validateCard', function(data) {
        for(let i in roomList) {
            if(roomList[i].code == data.room) {
                let topCard = roomList[i].discard[roomList[i].discard.length - 1];
                //Logic for if card is valid or not (matching color/value or wild)
                let valid = (data.card.color == topCard.color || data.card.value == topCard.value || data.card.color == 'WILD');
                if(valid){
                    io.sockets.emit('validateSuccess', {user: socket.id, card: data.card});
                } else {
                    io.sockets.emit('validateFail', {user: socket.id});
                }
            }
        }
    });


    //socket on playCard
    socket.on('playCard', function(data) {
        turnAdd = data.turnAdd;
        drawCards = data.draw;
        //console.log("playing card " + data.card.color + data.card.value);
        let oldColor = data.card.color;
        switch(data.card.value) {
            case "CHANGE_COLOR":
                data.card.color = data.newColor;
                drawTwo = false;
                drawCards = 0;
                break;
            
            case "DRAW_4":
                //Give next player 4 cards and skip next player's turn
                data.card.color = data.newColor;
                drawCards = 4;
                turnAdd *= 2;
                drawTwo = false;
                break;
            
            case "DRAW_TWO":
                //Draw 2 logic (give next player option to stack or draw)
                drawCards += 2;
                drawTwo = true;
                break;
            
            case "SKIP":
                turnAdd *= 2;
                drawTwo = false;
                drawCards = 0;
                break;
            
            case "REVERSE":
                turnAdd *= -1;
                drawTwo = false;
                drawCards = 0;
                break;
            
            default:
                drawTwo = false;
                drawCards = 0;
                break;
        }

        //Always do this
        let turn, discard, players;
        for(let i in roomList) {
            if(roomList[i].code == data.room) {
                //Update hand by removing played card
                for(let i in SOCKET_LIST) {
                    if(SOCKET_LIST[i].id == data.user) {
                        for(let card in SOCKET_LIST[i].hand){
                            if(SOCKET_LIST[i].hand[card].color == oldColor && SOCKET_LIST[i].hand[card].value == data.card.value) {
                                let index = SOCKET_LIST[i].hand.indexOf(SOCKET_LIST[i].hand[card]);
                                SOCKET_LIST[i].hand.splice(index, 1);
                                break;
                            }
                        }
                    }
                }
                //Get players
                players = roomList[i].players;
                //Update discard
                roomList[i].discard.push(data.card);
                discard = roomList[i].discard;
                //Update turn
                roomList[i].turn += turnAdd;
                if(roomList[i].turn > roomList[i].players.length - 1 && turnAdd > 0) {
                    roomList[i].turn = Math.abs(roomList[i].players.length - roomList[i].turn); //wrong
                } else if(roomList[i].turn < 0 && turnAdd < 0){
                    roomList[i].turn = roomList[i].players.length + roomList[i].turn; //wrong
                }
                turn = roomList[i].turn;
                //Reset if skipped
                if(turnAdd == 2 || turnAdd == -2) {
                    turnAdd = turnAdd/2;
                }
            }
        }
        io.sockets.emit('turn', {top: discard[discard.length - 1], players: players, turn: turn, turnAdd: turnAdd, draw: drawCards, drawTwo: drawTwo});

    });
});