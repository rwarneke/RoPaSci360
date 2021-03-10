const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

// const cors = require("cors");
// app.use(cors());

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

var game = new TicTacToeGame();

io.on("connection", (socket) => {
	console.log("a user connected");
	socket.emit("game", game);

	socket.on("move", (data) => {
		if (data.playingAs === game.playerToMove) {
			const square = data.square;
			game.makeMove(square);
			io.emit("game", game);
		}
	});

	socket.on("reset game", () => {
		game = new TicTacToeGame();
		io.emit("game", game);
	});
});

const port = process.env.PORT || 5000;
http.listen(port, () => {
	console.log(`server is running on port ${port}`);
});
