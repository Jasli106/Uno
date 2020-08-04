var socket = io();
let socketList = [];
let nameList = [];
let createButton, joinButton, playButton, nameInput, roomInput, roomCode, name;
let scene;
let currSocket, host, currRoom;

function setup() {
    //socket = io();

    createButton = document.getElementById("btn-create");
    joinButton = document.getElementById("btn-join");
    playButton = document.getElementById("btn-play");
    nameInput = document.getElementById("name-input");
    roomInput = document.getElementById("room-input");
    startButton = document.getElementById("start-game");

    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100);
    background(95);
    
    //Get list of active socket ids
    socket.on('newConnection', function(data){
        socketList = [];
        for(let i=0; i<data.length; i++) {
            socketList.push(data[i].id)
        }
        //console.log(socketList);
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

function draw() {
    background(95);
    fill(0);

    switch(scene) {
        //Welcome scene
        case 0:
            createButton.style.display = "none";
            joinButton.style.display = "none";
            playButton.style.display = "block";
            nameInput.style.display = "block";
            roomInput.style.display = "none";
            startButton.style.display = "none";

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
            for(let i=0; i<nameList.length; i++) {
                text(nameList[i], 0, i*10 + 50);
            }
            //host should be able to start the game, everyone can see who is in it
            if(host) {
                text(roomCode, 50, 50);
                startButton.style.display = "block";
            } else {

            }
            break;
        //Playing scene
        case 3:
            //Gameplay
            break;
    }
}

function play(){
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

function createGame() {
    roomCode = genRandStr(8); //Generate random string
    socket.emit("newRoom", {host: currSocket, code: roomCode, players: [], names: []});
    host = true;
    scene = 2;
}

function joinGame() {
    socket.emit("joinRoom", {player: currSocket, name: name, code: roomInput.value});
    currRoom = roomInput.value;
    socket.on('joinSuccess', function(){
        host = false;
        scene = 2;
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
    socket.on('joinFail', function(){
        //Alert the user to try again
    });
}

function startGame() {
    console.log("Starting game")
}

function genRandStr(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }