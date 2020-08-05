class Deck {
    constructor() {
        this.deck = [];
    }

    createDeck() {
        /*Create:
        Red 0, 2x 1-9, 2x draw 2, 2x skip, 2x reverse
        Yellow 0, 2x 1-9, 2x draw 2, 2x skip, 2x reverse
        Green 0, 2x 1-9, 2x draw 2, 2x skip, 2x reverse
        Blue 0, 2x 1-9, 2x draw 2, 2x skip, 2x reverse
        Wild 4x change color, 4x draw 4
        */

        //Red through Blue 0
        for(let color of colors.slice(0, 4)) {
            this.deck.push(new Card(color, values[0]));
        }
        //Red through Blue 2x 1-9 and action cards
        for(let color of colors.slice(0, 4)) {
            for(let value of values.slice(1,13)) {
                this.deck.push(new Card(color, value));
                this.deck.push(new Card(color, value));
            }
        }
        //Wild cards x4
        for(let value of values.slice(13, 15)) {
            this.deck.push(new Card(colors[4], value));
            this.deck.push(new Card(colors[4], value));
            this.deck.push(new Card(colors[4], value));
            this.deck.push(new Card(colors[4], value));
        }

        return this.deck;     
    }

    shuffle() {
        let counter = this.deck.length, temp, i;

        while(counter) {
            i = Math.floor(Math.random() * counter--);
            temp = this.deck[counter];
            this.deck[counter] = this.deck[i];
            this.deck[i] = temp;
        }

        return this.deck;
    }

    deal(numCards) {
        let hand = [];
        while(hand.length < numCards) {
            hand.push(this.deck.pop());
        }
        return hand;
    }
}

let deck = new Deck();
deck.createDeck();
deck.shuffle();
console.log(deck.deal(7));