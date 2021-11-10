var username;
var room;

function clickHand(handIndex) {
  socket.emit("clickHand", handIndex);
}

function generateCardHolder(card, index) {
  return (
    "<img class='cardHolder' src='/images/" + card + ".png' " + (index != undefined ? "onclick='clickHand(" + index + ");' " : "") + "/>"
  );
}

while (room === undefined || room === null || room.length == 0) {
  room = prompt("Game Code: ");
}

while (username === undefined || username === null || username.length == 0) {
  username = prompt("Username: ");
}

var socket = io();

socket.emit("username", username);

socket.emit("room", room);

window.addEventListener("load", () => {
  document.getElementById("roomcode").innerHTML = room;
});

socket.on("updatePlayers", players => {
  let output = "";

  for (var i = 0; i < players.length; i++) {
    output += players[i] + "<br>";
  }

  document.getElementById("users").innerHTML = output;

  if (players.length == 1) {
    while (!confirm("Start the Game?")) {}

    socket.emit("start");
  }
});

socket.on("updateCards", data => {
  let output = "";

  for (var i = 0; i < data.hand.length; i++) {
    output += generateCardHolder(data.hand[i], i);
  }

  document.getElementById("discard").innerHTML = generateCardHolder(data.discard);

  document.getElementById("hand").innerHTML = output;
});

socket.on("started", () => {
  alert("This game has already started...");
  location.reload();
});

socket.on("playerLeft", () => {
  alert("Someone left the game...");
  location.reload();
});
