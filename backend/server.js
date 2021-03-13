const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const io = require("socket.io")(http, {
	cors: {
		origin: "*",
	},
});

const lobbyIDRegex = new RegExp("^[0-9]{6}$");

const RoPaSciGame = require("./gameLogic/ropasci");

// var game = new RoPaSciGame();

var games = {};

io.on("connection", (socket) => {
	console.log("a user connected");
	// socket.emit("game", game.publicVersion());
	socket.emit("welcome");

	// called just after the user connects
	// the user decides what lobby they're in and sends this to the server
	socket.on("inform lobby id", (data) => {
		const { lobbyID } = data;

		if (!validLobbyID(lobbyID)) {
			console.log("Invalid lobby id", lobbyID);
			return;
		}

		socket.join(lobbyID);

		var game = games[lobbyID];
		if (game) {
			// this is an existing game
			game = games[lobbyID];
		} else {
			// no game exists for this lobby
			// create one
			game = new RoPaSciGame();
			games[lobbyID] = game;
			console.log(`Created ${Object.keys(games).length}th game (${lobbyID})`);
		}
		io.in(lobbyID).emit("game", game.publicVersion());
	});

	socket.on("reset game", (data) => {
		const { lobbyID } = data;
		if (!validLobbyID(lobbyID)) return;
		const game = new RoPaSciGame();

		if (games[lobbyID]) {
			delete games[lobbyID];
		} else {
			console.log(
				`Created ${Object.keys(games).length + 1}th game (${lobbyID})`
			);
		}

		games[lobbyID] = game;
		io.in(lobbyID).emit("game", game.publicVersion());
	});

	socket.on("move", (data) => {
		const { lobbyID, move } = data;
		if (!validLobbyID(lobbyID)) return;
		var game = games[lobbyID];
		if (!game) return;

		game.submitMove(move);
		if (game.justExecutedMoves) {
			io.in(lobbyID).emit("game", game.publicVersion());
		}
	});

	socket.on("cancel move", (data) => {
		const { lobbyID, player } = data;
		const game = games[lobbyID];
		if (!game) return;
		game.cancelMove(player);
	});
});

function validLobbyID(lobbyID) {
	return lobbyID.match(lobbyIDRegex);
}

if (process.env.NODE_ENV === "production") {
	console.log("production");
	app.use(express.static(path.join(__dirname, "../client/build")));

	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../client/build/index.html"));
	});
}

const port = process.env.PORT || 5000;
http.listen(port, () => {
	console.log(`server is running on port ${port}`);
});
