let colors = ['RED', 'YELLOW', 'GREEN', 'BLUE', 'WILD'];
let values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'DRAW_TWO', 'SKIP', 'REVERSE', 'CHANGE_COLOR', 'DRAW_4'];

class Card {
    constructor(color, value) {
        this.color = color;
        this.value = value;
    }
}