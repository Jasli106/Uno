var socket = io();
let socketList = [];
let nameList = [];
let createButton, joinButton, nameInput, playButton;
let scene;
let currSocket;

function setup() {
    //socket = io();

    createButton = document.getElementById("btn-create");
    joinButton = document.getElementById("btn-join");
    playButton = document.getElementById("btn-play");
    nameInput = document.getElementById("name-input")

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
        currSocket = socketList[socketList.length-1];
    });

    createButton.onclick = createGame;
    joinButton.onclick = joinGame;
    playButton.onclick = play;

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
            playButton.style.display = "none";
            nameInput.style.display = "none";

            for(let i=0; i<nameList.length; i++) {
                text(nameList[i], 0, i*10 + 50);
            }

            break;
        //Game lobby scene
        case 2:
            //host should be able to start the game, everyone can see who is in it
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
        console.log(nameList);
    });
    scene = 1;
}

function createGame() {
    console.log("Creating new game");
}

function joinGame() {
    console.log("Joining game");
}