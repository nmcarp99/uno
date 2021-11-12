// set leadersocket.gameStarted to true when startin game!!! (dont forget)

const port = 8080;

var app = require("express")();
var http = require("http").Server(app);
var fs = require("fs");
var io = require("socket.io")(http);
var deck = require("./deck");

var gameData = {};

function start(socket) {
  if (socket.id != gameData[socket.room].startID) return;

  gameData[socket.room].gameStarted = true;

  gameData[socket.room].turn = 0;

  updateCards(socket.room);
  updateUsers(socket.room);
}

function nextTurn(socket) {
  socket.drawn = false;

  let discard = gameData[socket.room].discard;

  if (discard[1] == "R" && !gameData[socket.room].reversed) {
    gameData[(socket.room.reversed = true)];
    gameData[socket.room].turnDirection *= -1;
  }

  gameData[socket.room].turn =
    (gameData[socket.room].turn +
      gameData[socket.room].turnDirection +
      getUsersInRoom(socket.room).length) %
    getUsersInRoom(socket.room).length;

  let newTurnUser = getUsersInRoom(socket.room)[gameData[socket.room].turn];

  if (discard[1] == "+") {
    for (var i = 0; i < discard.substr(2, discard.length - 2); i++) {
      newTurnUser.hand.push(draw(socket.room));
    }
  }

  if (discard[1] == "S" && !gameData[socket.room].skipped) {
    gameData[socket.room].skipped = true;
    nextTurn(newTurnUser);
  }

  updateCards(socket.room);
  updateUsers(socket.room);
}

function checkCards(card1, card2, color) {
  return (
    (card1[0] == "W" && card2[0] == color) ||
    card2[0] == "W" ||
    card1[0] == card2[0] ||
    card1.substr(1, card1.length - 1) == card2.substr(1, card2.length - 1)
  );
}

function updateUsers(room) {
  io.to(room).emit("updatePlayers", {
    players: getUserNamesInRoom(room),
    turn: gameData[room].turn
  });
}

function updateCards(room) {
  let users = getUsersInRoom(room);

  for (var user of users) {
    user.emit("updateCards", {
      hand: user.hand,
      discard: gameData[room].discard,
      color: gameData[room].color
    });
  }
}

function draw(room) {
  let topCard = gameData[room].deck[0];
  gameData[room].deck.shift();
  return topCard;
}

function getUserNamesInRoom(room) {
  var viewers = [];

  //this is an ES6 Set of all client ids in the room
  var clients = io.sockets.adapter.rooms.get(room);

  //to get the number of clients in this room
  var numClients = clients ? clients.size : 0;

  try {
    for (var clientId of clients) {
      //this is the socket of each client in the room.
      var clientSocket = io.sockets.sockets.get(clientId);

      viewers.push(clientSocket.name);
    }

    return viewers;
  } catch (error) {
    console.log(error);
  }
}

function getUsersInRoom(room) {
  var viewers = [];

  //this is an ES6 Set of all client ids in the room
  var clients = io.sockets.adapter.rooms.get(room);

  //to get the number of clients in this room
  var numClients = clients ? clients.size : 0;

  try {
    for (var clientId of clients) {
      //this is the socket of each client in the room.
      var clientSocket = io.sockets.sockets.get(clientId);

      viewers.push(clientSocket);
    }

    return viewers;
  } catch (error) {
    console.log(error);
  }
}

app.get("/*", (req, res) => {
  let filePath = "/app/public/" + req.url.substr(1, req.url.length - 1);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res
      .status(404)
      .send('File not found at "localhost' + req.url + '" on port 80');
  }
});

io.on("connection", function(socket) {
  socket.on("username", function(data) {
    socket.name = data;
  });

  socket.on("room", function(data) {
    if (gameData[data] && gameData[data].gameStarted == true) {
      socket.emit("started");
      return;
    }

    socket.room = data;
    socket.join(data);

    let usersInRoom = getUserNamesInRoom(socket.room);

    if (usersInRoom.length == 1) {
      gameData[socket.room] = {};
      gameData[socket.room].startID = socket.id;
      gameData[socket.room].deck = deck.newDeck();
      gameData[socket.room].discard = draw(socket.room);
      gameData[socket.room].gameStarted = false;
      gameData[socket.room].skipped = false;
      gameData[socket.room].reversed = false;
      gameData[socket.room].turnDirection = 1;
    }

    socket.hand = [];

    for (var i = 0; i < 7; i++) {
      socket.hand.push(draw(socket.room));
    }

    socket.playerIndex = usersInRoom.length - 1;

    socket.drawn = false;

    updateUsers(socket.room);
  });

  socket.on("setColor", colorIndex => {
    if (
      !gameData[socket.room].gameStarted ||
      gameData[socket.room].turn != socket.playerIndex ||
      gameData[socket.room].color != undefined
    ) return;
    
    let colorOptions = ["R", "G", "B", "Y"];
    
    gameData[socket.room].color = colorOptions[colorIndex];
    
    nextTurn(socket);
  });

  socket.on("clickHand", handIndex => {
    if (
      !gameData[socket.room].gameStarted ||
      gameData[socket.room].turn != socket.playerIndex
    )
      return;

    if (checkCards(gameData[socket.room].discard, socket.hand[handIndex], gameData[socket.room].color)) {
      gameData[socket.room].discard = socket.hand[handIndex];

      gameData[socket.room].skipped = false;
      gameData[socket.room].reversed = false;
      gameData[socket.room].color = undefined;

      socket.hand.splice(handIndex, 1);

      if (gameData[socket.room].discard[0] != "W") {
        nextTurn(socket);
      } else {
        socket.emit("pickColor");
      }

      updateCards(socket.room);
      
      if (socket.hand.length == 0) {
        io.to(socket.room).emit("gameOver", socket.name);
      }
    }
  });

  socket.on("draw", function() {
    if (!gameData[socket.room].gameStarted) {
      start(socket);
      return;
    } else if (gameData[socket.room].turn != socket.playerIndex || socket.drawn) return;

    socket.hand.push(draw(socket.room));

    let possibleToPlay = false;

    for (var i = 0; i < socket.hand.length; i++) {
      if (checkCards(gameData[socket.room].discard, socket.hand[i], gameData[socket.room].color)) {
        possibleToPlay = true;
      }
    }

    socket.drawn = true;

    if (!possibleToPlay) {
      nextTurn(socket);
    }

    updateCards(socket.room);
  });

  socket.on("disconnect", function() {
    io.to(socket.room).emit("playerLeft");

    if (gameData[socket.room] == undefined) return;

    gameData[socket.room].gameStarted = false;
  });
});

http.listen(port, () => {
  console.log("Listening on port " + port);
});
