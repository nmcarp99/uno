function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

exports.newDeck = () => {
  let colors = ["Y", "G", "B", "R"];
  let specialCards = ["R", "+2", "S"]; // reverse, +2, and skip
  let wilds = ["W+4", "WC"]; // wild + 4 and wild color

  let deck = [];

  for (var i = 0; i < colors.length; i++) {
    for (var j = 0; j < 10; j++) {
      for (var k = 0; k < 2; k++) {
        if (j == 0 && k == 1) {
          // if we are creating the 0 cards and we have already done one, quit (there is only one 0 of every color)
          break;
        }

        deck.push(colors[i] + j.toString());
      }
    }

    for (var j = 0; j < specialCards.length; j++) {
      for (var k = 0; k < 2; k++) {
        deck.push(colors[i] + specialCards[j].toString());
      }
    }
  }
  
  for (var i = 0; i < wilds.length; i++) {
    for (var j = 0; j < 4; j++) {
      deck.push(wilds[i]);
    }
  }
  
  deck = shuffle(deck);
  
  return deck;
};
