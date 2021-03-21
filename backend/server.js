const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const io = require("socket.io")(http, {
	cors: {
		origin: "*",
	},
});

const UPPER = "Blue";
const LOWER = "Red";

const lobbyIDRegex = new RegExp("^[0-9]{6}$");

const RoPaSciGame = require("./gameLogic/ropasci");

// var game = new RoPaSciGame();

const games = {};
const lastSeenPlayingAs = {};

io.on("connection", (socket) => {
	console.log("a user connected");
	// socket.emit("game", game.publicVersion());
	socket.emit("welcome");

	// called just after the user connects
	// the user decides what lobby they're in and sends this to the server
	socket.on("inform lobby id", (data) => {
		const { lobbyID } = data;

		if (!validLobbyID(lobbyID)) {
			// should never happen
			console.log("Invalid lobby id", lobbyID);
			return;
		}

		var recommendation = UPPER;
		if (io.sockets.adapter.rooms.has(lobbyID)) {
			const room = Array.from(io.sockets.adapter.rooms.get(lobbyID));
			const socketIDOfLastPlayerTOJoin = room.pop();
			if (lastSeenPlayingAs[socketIDOfLastPlayerTOJoin]) {
				recommendation = otherPlayer(
					lastSeenPlayingAs[socketIDOfLastPlayerTOJoin]
				);
			}
		}
		socket.emit("recommend playing as", {
			player: recommendation,
		});

		// add the socket to a room of sockets in this lobby
		// they will all be sent game updates when moves occur
		socket.join(lobbyID);

		lastSeenPlayingAs[socket.id] = recommendation;
		informLobbyOfAnyClashes(lobbyID);

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
		socket.emit("game", game.publicVersion());
	});

	socket.on("disconnecting", (reason) => {
		// need to work out the lobby the user was in
		const lobbyID = Array.from(socket.rooms.values()).pop(); // awful
		console.log(`A user disconnected from ${lobbyID} (${reason})`);
		socket.leave(lobbyID);
		informLobbyOfAnyClashes(lobbyID);
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
		console.log("GOT MOVE");
		const { lobbyID, nMovesObserved, move } = data;
		if (!validLobbyID(lobbyID)) return;
		var game = games[lobbyID];
		if (!game) return;
		// ignore late moves
		if (game.nMoves !== nMovesObserved) return;

		game.submitMove(move);
		if (game.justExecutedMoves) {
			io.in(lobbyID).emit("game", game.publicVersion());
			console.log("EMITTED GAME");
		}
	});

	socket.on("cancel move", (data) => {
		const { lobbyID, nMovesObserved, player } = data;
		const game = games[lobbyID];
		if (!game) return;
		// ignore late cancellations
		if (game.nMoves !== nMovesObserved) return;
		game.cancelMove(player);
	});

	socket.on("playing as", (data) => {
		const { lobbyID, player } = data;
		lastSeenPlayingAs[socket.id] = player;
		informLobbyOfAnyClashes(lobbyID);
	});
});

function validLobbyID(lobbyID) {
	return lobbyID.match(lobbyIDRegex);
}

function otherPlayer(player) {
	return player === UPPER ? LOWER : UPPER;
}

function informLobbyOfAnyClashes(lobbyID) {
	const roomSet = io.sockets.adapter.rooms.get(lobbyID);
	const room = roomSet ? Array.from(roomSet) : [];
	counts = { [UPPER]: 0, [LOWER]: 0 };
	for (var socketID of room) {
		if (lastSeenPlayingAs[socketID]) {
			counts[lastSeenPlayingAs[socketID]]++;
		} else {
			console.log(`Haven't seen ${socketID} playing as anyone!`);
		}
	}
	io.in(lobbyID).emit("clash update", {
		[UPPER]: counts[UPPER] > 1,
		[LOWER]: counts[LOWER] > 1,
	});
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
