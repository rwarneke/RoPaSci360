class TicTacToeGame {
	static winningLines = [
		[1, 2, 3],
		[4, 5, 6],
		[7, 8, 9],
		[1, 5, 9],
		[7, 5, 3],
		[1, 4, 7],
		[2, 5, 8],
		[3, 6, 9],
	];

	constructor() {
		this.board = {};
		for (var i = 1; i <= 9; i++) {
			this.board[i] = "";
		}
		this.playerToMove = "X";
	}

	isOver() {
		for (var i in TicTacToeGame.winningLines) {
			var line = TicTacToeGame.winningLines[i];
			var p1 = this.board[line[0]];
			var p2 = this.board[line[1]];
			var p3 = this.board[line[2]];
			if (p1 !== "" && p1 === p2 && p1 === p3) return true;
		}
		return false;
	}

	static otherPlayer(player) {
		return player === "X" ? "O" : "X";
	}

	makeMove(squareNum) {
		if (this.isOver()) {
			return false;
		}
		if (this.board[squareNum] !== "") {
			// square already occupied
			return false;
		}
		this.board[squareNum] = this.playerToMove;
		this.playerToMove = TicTacToeGame.otherPlayer(this.playerToMove);
		return true;
	}
}
