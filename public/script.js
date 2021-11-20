var draggedElement;
var username;
var room;
var playerIndex;
var tabFocused = true;
var messagesSent = 0;
var banned = false;
var banTimeLeft = 30;
var banInterval;

function addToMessages(data) {
  let message = document.getElementById("chatContent");

  message.innerHTML = data + "<br><br>" + message.innerHTML;
}

function clickHand(id) {
  socket.emit("clickHand", id);
}

function sendColor(colorIndex) {
  socket.emit("setColor", colorIndex);
  $(".colorChooser").animate({
    top: "-60vh"
  });
}

function updateBan() {
  if (banTimeLeft == 0) {
    document.getElementById("message").disabled = false;
    document.getElementById("message").placeholder = "Type message here...";
    clearInterval(banInterval);
    banned = false;
    return;
  }

  banTimeLeft--;
  document.getElementById("message").placeholder =
    "Please wait " + banTimeLeft + " more seconds...";
}

function toggleDiscard() {
  document.getElementById("discard").classList.toggle("dropping");
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
  document.getElementById("username").innerHTML = username;
  document.getElementById("roomcode").innerHTML = room;

  document.getElementById("message").addEventListener("keydown", e => {
    if (e.code == "Enter") {
      if (messagesSent > 1) {
        banTimeLeft = 30;

        banned = true;

        document.getElementById("message").disabled = true;
        document.getElementById("message").value = "";

        banInterval = setInterval(updateBan, 1000);

        addToMessages("You have been banned for spamming...");
        return;
      }

      if (banned) return;

      let message = document.getElementById("message");

      socket.emit("message", message.value);
      message.value = "";

      messagesSent++;
    }
  });

  let discard = document.getElementById("discard");

  discard.addEventListener("dragenter", toggleDiscard);
  discard.addEventListener("dragleave", toggleDiscard);

  discard.addEventListener("dragover", e => {
    e.preventDefault();
    e.dataTransfer.effectAllowed = "move";
  });

  discard.addEventListener("drop", () => {
    clickHand(draggedElement.id);
    toggleDiscard();
  });
});

socket.on("updatePlayers", data => {
  let players = data.players;
  let cardCounts = data.cardsLeft;
  let turn = data.turn;
  let output = "";

  if (playerIndex === undefined) {
    playerIndex = players.length - 1;
  }

  if (turn == playerIndex && !tabFocused) {
    alert("Your Turn!");
  }

  for (var i = 0; i < players.length; i++) {
    if (turn === i)
      output +=
        "<span style='font-weight: bolder; text-decoration: underline;'>";
    output += players[i];
    if (cardCounts[i]) output += " (" + cardCounts[i] + ")";
    if (turn === i) output += " &#x25cf;</span>";
    output += "<br>";
  }

  document.getElementById("usersContent").innerHTML = output;
});

socket.on("updateCards", data => {
  let hand = document.getElementById("hand");

  hand.innerHTML = "";

  for (var i = 0; i < data.hand.length; i++) {
    hand.appendChild(generateCardHolder(data.hand[i], "grab", i));
  }

  let discard = document.getElementById("discard");

  if (data.discard[0] == "W") {
    // if a wild is on top of the discard pile
    let colorOptions = {
      R: "red",
      G: "green",
      B: "blue",
      Y: "yellow"
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

socket.on("message", data => {
  addToMessages(data);
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

socket.on("reset", winner => {
  alert(winner + " Won!");

  document.getElementById("hand").innerHTML = "";
  document.getElementById("discard").style.opacity = 0;
});

window.addEventListener("blur", () => {
  tabFocused = false;
});
window.addEventListener("focus", () => {
  tabFocused = true;
});
window.addEventListener("beforeunload", event => {
  event.returnValue = false;
});

setInterval(() => {
  messagesSent = 0;
}, 1000);
