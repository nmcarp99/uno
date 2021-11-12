var draggedElement;
var username;
var room;

function clickHand(id) {
  socket.emit("clickHand", id);
}

function sendColor(colorIndex) {
  socket.emit("setColor", colorIndex);
  $('.colorChooser').animate({
    top: "-60vh"
  });
}

function generateCardHolder(card, cursor, index) {
  let object = document.createElement("img");

  object.classList.add("cardHolder");

  object.style.cursor = cursor;
  object.src = "/images/" + card + ".png";
  object.id = index;

  object.onclick = e => {
    clickHand(e.srcElement.id);
  };

  object.addEventListener("dragstart", e => {
    draggedElement = e.srcElement;
    object.classList.add("drag");
  });

  object.addEventListener("dragend", () => {
    draggedElement = undefined;
    object.classList.remove("drag");
  });

  return object;
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

  let discard = document.getElementById("discard");

  discard.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.effectAllowed = "move";
  });

  discard.addEventListener("drop", () => {
    clickHand(draggedElement.id);
  });
});

socket.on("updatePlayers", data => {
  let players = data.players;
  let turn = data.turn;
  let output = "<h1>Players</h1>";

  for (var i = 0; i < players.length; i++) {
    if (turn === i) output += "<span style='font-weight: bolder'>";
    output += players[i];
    if (turn === i) output += " &#x25cf;</span>";
    output += "<br>";
  }

  document.getElementById("users").innerHTML = output;
});

socket.on("updateCards", data => {
  let hand = document.getElementById("hand");

  hand.innerHTML = "";

  for (var i = 0; i < data.hand.length; i++) {
    hand.appendChild(generateCardHolder(data.hand[i], "grab", i));
  }

  let discard = document.getElementById("discard");

  if (data.discard[0] == "W") { // if a wild is on top of the discard pile
    let colorOptions = {
      "R": "red",
      "G": "green",
      "B": "blue",
      "Y": "yellow"
    };
    
    console.log("asdf");
    console.log(colorOptions[data.color]);
    
    discard.style.border = colorOptions[data.color] + " 5px solid";
  } else {
    discard.style.border = "";
  }
  
  discard.src = "/images/" + data.discard + ".png";
  discard.style.opacity = "";
});

socket.on("pickColor", () => {
  $(".colorChooser").animate({
    top: "25vh"
  });
});

socket.on("started", () => {
  alert("This game has already started...");
  location.reload();
});

socket.on("playerLeft", () => {
  alert("Someone left the game...");
  location.reload();
});

socket.on("disconnect", () => {
  alert("You have been disconnected from the server...");
  location.reload();
});

socket.on("gameOver", winner => {
  alert(winner + " Won!");
  location.reload();
})