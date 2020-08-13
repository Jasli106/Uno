var socket = io();
let socketList = [];
let nameList = [];
let playersList = [];
let createButton, joinButton, playButton, nameInput, roomInput, roomCode, name, popup;
let scene;
let currSocket, host, currRoom;
var topCard, wildValue, turnAdd;

function setup() {
    //socket = io();

    createButton = document.getElementById("btn-create");
    joinButton = document.getElementById("btn-join");
    playButton = document.getElementById("btn-play");
    nameInput = document.getElementById("name-input");
    roomInput = document.getElementById("room-input");
    startButton = document.getElementById("start-game");
    unoButton = document.getElementById("uno");
    drawButton = document.getElementById("draw");
    colorPopup = document.getElementById("choose-color");
    drawPopup = document.getElementById("stack-or-draw");

    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100);
    background(95);
    
    //Get list of active socket ids
    socket.on('newConnection', function(data){
        socketList = [];
        for(let i=0; i<data.length; i++) {
            socketList.push(data[i].id)
        }
        if(!currSocket) {
            currSocket = socketList[socketList.length-1];
        }
    });

    createButton.onclick = createGame;
    joinButton.onclick = joinGame;
    playButton.onclick = play;
    startButton.onclick = startGame;

    scene = 0;
}

function gameLoop() {
    background(95);
    fill(0);

    if(topCard) {
        text(`${topCard.color} ${topCard.value}`, 50, 50);
    }

    switch(scene) {
        //Welcome scene
        case 0:
            createButton.style.display = "none";
            joinButton.style.display = "none";
            playButton.style.display = "block";
            nameInput.style.display = "block";
            roomInput.style.display = "none";
            startButton.style.display = "none";
            unoButton.style.display = "none";
            drawButton.style.display = "none";
            colorPopup.style.display = "none";
            drawPopup.style.display = "none";

            if(nameInput.value.length == 0) {
                playButton.disabled = true;
            } else {
                playButton.disabled = false;
            }
            break;
        //Main menu scene
        case 1:
            createButton.style.display = "block";
            joinButton.style.display = "block";
            roomInput.style.display = "block";
            playButton.style.display = "none";
            nameInput.style.display = "none";

            for(let i=0; i<nameList.length; i++) {
                text(nameList[i], 0, i*10 + 50);
            }
            if(roomInput.value.length == 0) {
                joinButton.disabled = true;
            } else {
                joinButton.disabled = false;
            }
            break;
        //Game lobby scene
        case 2:
            createButton.style.display = "none";
            joinButton.style.display = "none";
            roomInput.style.display = "none";
            for(let i=0; i<playersList.length; i++) {
                text(playersList[i].name, 0, i*10 + 50);
            }
            //host should be able to start the game, everyone can just see who is in it
            if(host) {
                text(roomCode, 50, 50);
                startButton.style.display = "block";
            }
            break;
        //Playing scene
        case 3:
            //Gameplay
            socket.off('turn');
            socket.once("turn", function(data){
                console.log(data.turn);
                startButton.style.display = "none";
                topCard = data.top;
                for(let player in data.players) {
                    //If currently your turn
                    if(data.players[player].socket == currSocket && data.players[player].number == data.turn) {
                        //If last player played a draw2
                        if(data.drawTwo) {
                            drawPopup.style.display = "block";
                        }
                        //Show hand and buttons
                        playTurn(data.players[player].hand);
                        unoButton.style.display = "block";
                    //If not your turn
                    } else if(data.players[player].socket == currSocket) {
                        //Remove all cards from hand div
                        let handDiv = document.getElementById('hand');
                        while(handDiv.firstChild){
                            handDiv.removeChild(handDiv.firstChild);
                        }
                        //Hide draw button
                        drawButton.style.display = "none";
                        unoButton.style.display = "none";
                    }
                }
                turnAdd = data.turnAdd;
            });
            break;
    }
}

//Functionality for when it's your turn
function playTurn(hand) {
    //Remove all cards from hand div
    let handDiv = document.getElementById('hand');
    while(handDiv.firstChild){
        handDiv.removeChild(handDiv.firstChild);
    }
    //Regenerate hand
    hand.forEach(card => {
        var cardBtn = document.createElement('BUTTON');
        cardBtn.type = 'card';
        cardBtn.innerHTML = `<img src="../client/assets/${card.color}${card.value}.png" alt="${card.color} ${card.value}" width="65" height="91">`//`${card.color} ${card.value}`;
        cardBtn.onclick = function() {
            cardOnClick(card);
        };
        handDiv.appendChild(cardBtn);
    });

    //Show draw button + functionality
    drawButton.style.display = "block";
    drawButton.onclick = function() {
        socket.emit('drawCard', {socket: currSocket, room: currRoom, turnAdd: turnAdd});
        drawButton.style.display = "none";
    }
}

//When card selected to be played
function cardOnClick(card) {
    //Check if card valid first
    socket.emit('validateCard', {card: card, room: currRoom});
    socket.off('validateSuccess');
    socket.once('validateSuccess', function(data) {
        if(data.user == currSocket) {
            //If wild card
            if(card.color == "WILD") {
                //Display choose color popup
                wildValue = card.value;
                colorPopup.style.display = "block";
            } else { //Any color card
                socket.emit('playCard', {card: card, user: currSocket, room: currRoom, turnAdd: turnAdd});
                //Update UI
                drawButton.style.display = "none";
                let handDiv = document.getElementById('hand');
                while(handDiv.firstChild){
                handDiv.removeChild(hand.firstChild);
                }
            }
        }
    });
    socket.off('validateFail');
    socket.once('validateFail', function(data) {
        if(data.user == currSocket) {
            //Alert the user to try again
            alert("Can't play card.");
        }
    });

}

//To enter main menu as a new user
function play() {
    socket.emit("newUser", {currSocket: currSocket, name: nameInput.value});
    socket.on('updateUsers', function(data){
        nameList = [];
        for(let i=0; i<data.length; i++) {
            nameList.push(data[i].name);
        }
    });
    name = nameInput.value;
    scene = 1;
}

//When player creates a new room
function createGame() {
    roomCode = genRandStr(8); //Generate random string
    currRoom = roomCode;
    console.log(roomCode);
    socket.emit("newRoom", {host: currSocket, code: roomCode, players: [currSocket], names: [name]});
    host = true;
    scene = 2;
    playersList.push({name: name, socket: currSocket});

    //When new player joins room
    socket.on('joinSuccess', function(data){
        playersList = [];
        for(let i=0; i<data.names.length; i++) {
            playersList.push({name: data.names[i], socket: data.players[i]});
        }
    });
}

//When player joins a room
function joinGame() {
    socket.emit("joinRoom", {player: currSocket, name: name, code: roomInput.value});
    currRoom = roomInput.value;
    socket.on('joinSuccess', function(data){
        host = false;
        scene = 2;
        playersList = [];
        for(let i=0; i<data.names.length; i++) {
            playersList.push({name: data.names[i], socket: data.players[i]});
        }

        //Listen for being kicked from a game
        socket.on('kickFromRoom', function(data){
            if(data.code == currRoom) {
                console.log("being kicked");
                scene = 1;
                roomInput.value = null;
                data.code = null;
            }
        });
    });
    socket.once('joinFail', function(){
        //Alert the user to try again
        alert("This room does not exist.");
    });
    socket.once("turn", function(data){
        topCard = data.top;
        scene = 3;
        startButton.style.display = "none";
        for(let player in data.players) {
            if(data.players[player].socket == currSocket && data.players[player].number == data.turn) {
                playTurn(data.players[player].hand);
                unoButton.style.display = "block";
            } else if(data.players[player].socket == currSocket) {
                //Draw cards
            }
        }
        turnAdd = data.turnAdd;
    });
}

//To signal the start of a new game
function startGame() {
    scene = 3;
    startButton.style.display = "none";
    //Listen for server sending turn
    socket.once("turn", function(data){
        topCard = data.top;
        scene = 3;
        startButton.style.display = "none";
        for(let player in data.players) {
            if(data.players[player].socket == currSocket && data.players[player].number == data.turn) {
                playTurn(data.players[player].hand);
                unoButton.style.display = "block";
            } else if(data.players[player].socket == currSocket) {
                //Draw cards
            }
        }
        turnAdd = data.turnAdd;
    });
    socket.emit('startGame', {players: playersList, code: currRoom});
}

//Hide modal when color chosen
function changeColor(color) {
    colorPopup.style.display = "none";
    socket.emit('playCard', {card: {color: "WILD", value: wildValue}, user: currSocket, room: currRoom, newColor: color, turnAdd: turnAdd});
    //Update UI
    drawButton.style.display = "none";
    let handDiv = document.getElementById('hand');
    while(handDiv.firstChild){
    handDiv.removeChild(hand.firstChild);
    }
}

//Random string generator function for room codes
function genRandStr(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }


 setInterval(gameLoop, 33);