// set leadersocket.gameStarted to true when startin game!!! (dont forget)

const port = 8080;

var app = require("express")();
var http = require("http").Server(app);
var fs = require("fs");
var io = require("socket.io")(http);
var deck = require("./deck");

var leaders = {};

function checkCards(card1, card2) {
  return (
    card1[0] == "W" ||
    card2[0] == "W" ||
    card1[0] == card2[0] ||
    card1[1] == card2[1]
  );
}

function updateCards(room) {
  let users = getUsersInRoom(room);

  for (var user of users) {
    user.emit("updateCards", {
      hand: user.hand,
      discard: leaders[room].discard
    });
  }
}

function draw(room) {
  let topCard = leaders[room].deck[0];
  leaders[room].deck.shift();
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
    if (leaders[data] && leaders[data].gameStarted == true) {
      socket.emit("started");
      return;
    }

    socket.room = data;
    socket.join(data);

    let usersInRoom = getUserNamesInRoom(socket.room);

    if (usersInRoom.length == 1) {
      leaders[socket.room] = socket;

      socket.deck = deck.newDeck();

      socket.discard = draw(socket.room);
    }

    socket.hand = [];

    for (var i = 0; i < 7; i++) {
      socket.hand.push(draw(socket.room));
    }

    socket.playerIndex = usersInRoom.length - 1;

    io.to(socket.room).emit("updatePlayers", usersInRoom);
  });

  socket.on("clickHand", handIndex => {
    if (
      !leaders[socket.room].gameStarted ||
      leaders[socket.room].turn != socket.playerIndex
    )
      return;

    if (checkCards(leaders[socket.room].discard, socket.hand[handIndex])) {
      leaders[socket.room].discard = socket.hand[handIndex];
      
      socket.hand.splice(handIndex, 1);
      
      updateCards(socket.room);
    }

    leaders[socket.room].turn =
      (leaders[socket.room].turn + 1) % getUsersInRoom(socket.room).length;
  });

  socket.on("draw", () => {
    if (!leaders[socket.room].gameStarted) return;

    console.log("draw");
  });

  socket.on("start", () => {
    if (socket == leaders[socket.room]) {
      leaders[socket.room].gameStarted = true;

      socket.turn = 0;
    }

    updateCards(socket.room);
  });

  socket.on("disconnect", () => {
    io.to(socket.room).emit("playerLeft");
  });
});

http.listen(port, () => {
  console.log("Listening on port " + port);
});
