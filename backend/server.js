const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const io = require("socket.io")(http, {
	cors: {
		origin: "*",
	},
});

// import { RoPaSciGame } from "./gameLogic";
const RoPaSciGame = require("./gameLogic/ropasci");

// const cors = require("cors");
// app.use(cors());

var game = new RoPaSciGame();

// game.submitMove({
// 	player: "Upper",
// 	throwing: true,
// 	thrownTokenType: "S",
// 	toHex: [4, -1],
// });

// game.submitMove({
// 	player: "Lower",
// 	throwing: true,
// 	thrownTokenType: "r",
// 	toHex: [-4, 0],
// });

// game.submitMove({
// 	player: "Upper",
// 	throwing: true,
// 	thrownTokenType: "S",
// 	toHex: [4, 0],
// });

// game.submitMove({
// 	player: "Lower",
// 	throwing: true,
// 	thrownTokenType: "s",
// 	toHex: [-4, 1],
// });

io.on("connection", (socket) => {
	console.log("a user connected");
	socket.emit("game", game);

	socket.on("reset game", () => {
		game = new RoPaSciGame();
		io.emit("game", game);
	});

	socket.on("move", (move) => {
		game.submitMove(move);
		if (game.justExecutedMoves) {
			console.log("emitting game...");
			io.emit("game", game);
		}
	});
});

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
