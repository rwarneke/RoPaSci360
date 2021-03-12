const UPPER = "Upper";
const LOWER = "Lower";

const DRAW = "Draw";

class Game {
	static MAX_N_MOVES = 360;
	static MAX_N_THROWS = 9;

	static NEMISIS = {
		r: "P",
		p: "S",
		s: "R",
		R: "p",
		P: "s",
		S: "r",
	};

	constructor() {
		this.board = Game.emptyBoard();

		/*
		RoPaSci360 is a two player *simultaneous turn* game.
		
		We keen track of the submitted turn of each player.
		If a player submits a turn, check if they are the second to do so.
		If so, execute both turns. Otherwise, wait for the other player.
		*/
		this.nextMoves = {
			Upper: null,
			Lower: null,
		};

		this.lastMoves = {
			Upper: null,
			Lower: null,
		};

		// number of throws taken by each player to this point
		this.nThrowsRemaining = {
			Upper: Game.MAX_N_THROWS,
			Lower: Game.MAX_N_THROWS,
		};

		// the number of each token type on the total board
		this.tokenCounts = {
			r: 0,
			p: 0,
			s: 0,
			R: 0,
			P: 0,
			S: 0,
		};

		// the number of total moves
		this.nMoves = 0;

		// the number of tokens captured by each player
		// this could technically be derived from nThrowsRemaining and tokenCounts
		// this is really the "score" of the game. First to 9 wins.
		this.nCaptured = {
			Upper: 0,
			Lower: 0,
		};

		this.gameOver = false;
		this.winner = null;

		this.justExecutedMoves = false;
	}

	static emptyBoard() {
		/*
		The board is a hexagonal lattice with 5 hexes on each edge (61 total) 
		The coordinate system uses paramters r and q.
		- r defines the row, with -4 at the bottom and 4 at the top
		- q defines the upright diagonal, also from -4 to 4
		Examples:
		- the center hex is (0,0)
		- the leftmost hex is (0,-4)
		- the bottom right hex is (-4,4)
		Note that the hexes are not defined by {(r, q) | r in R, q in Q},
		since for different values of r (q), different values of q (r) exist.
		We *can* define the board by {(r, q) | r in R, q in Q(r)} to solve this.

		The set Q(r) is defined by
			{-4-min(r,0), ..., 4-max(r,0)}.
		I'll just let you think about that one.

		Note that in RoPaSci360, hexes can be occupied by multiple pieces.
		Pieces must be one of the characters "rpsRPS" (corresponding to rock,
		paper and scissors of lower and upper respectively).

		The value of each hex is a lookup table of how many of each piece type
		it contains.
		*/
		var board = {};
		for (let r = -4; r <= 4; r++) {
			let qmin = -4 - Math.min(r, 0);
			let qmax = 4 - Math.max(r, 0);
			for (let q = qmin; q <= qmax; q++) {
				board[[r, q]] = {
					r: 0, // this is the name r, not the variable. thank you js
					p: 0,
					s: 0,
					R: 0,
					P: 0,
					S: 0,
				};
			}
		}
		return board;
	}

	publicVersion = () => {
		const { nextMoves, ...rest } = this;
		return rest;
	};

	submitMove(move) {
		this.justExecutedMoves = false;
		if (this.legalMove(move)) {
			console.log(`move accepted (${move.player})`);
			const { player } = move;
			this.nextMoves[player] = move;
			if (this.nextMoves.Lower && this.nextMoves.Upper) {
				this.executeMoves();
				this.justExecutedMoves = true;
			}
		} else {
			console.log(`move rejected (${move.player})`);
		}
	}

	cancelMove(player) {
		if (player !== UPPER && player !== LOWER) {
			console.log(`move cancellation rejected (invalid player ${player})`);
		}
		if (!this.nextMoves[player]) {
			console.log(`move cancellation rejected (${player})`);
			return false;
		} else {
			this.nextMoves[player] = null;
			console.log(`move cancellation accepted (${player})`);
			return true;
		}
	}

	legalMove(move) {
		if (this.gameOver) return false;

		const { player, throwing, thrownTokenType, fromHex, toHex } = move;

		// VALIDATE PARAMETERS
		// player
		if (![UPPER, LOWER].includes(player)) return false;
		// throwing
		if (typeof throwing !== "boolean") return false;
		// tokenType
		if (throwing) {
			if (player === UPPER) {
				if (!"RPS".includes(thrownTokenType)) return false;
			} else {
				if (!"rps".includes(thrownTokenType)) return false;
			}
		}
		// fromHex
		if (!throwing) {
			if (!Game.validHex(fromHex)) return false;
		}
		// toHex
		if (!Game.validHex(toHex)) return false;

		// console.log("validation complete");

		if (throwing) {
			// must have a throw available
			if (this.nThrowsRemaining[player] === 0) return false;
			// for throw n, must be on first n rows
			let r = toHex[0];
			let row = player === UPPER ? 5 - r : 5 + r;
			let nThrowsTaken = Game.MAX_N_THROWS - this.nThrowsRemaining[player];
			let n = nThrowsTaken + 1;
			return row <= n;
		} else {
			// okay, it's not a throw, it's a movement on the board
			// first, make sure a token is available to move
			const candidateTokenTypes = player === UPPER ? "RPS" : "rps";
			var movedTokenType = null;
			for (let tt of candidateTokenTypes) {
				if (this.board[fromHex][tt]) {
					movedTokenType = tt;
					break;
				}
			}
			// if we didn't find a token type, the player doesn't have a token to move on this hex
			if (!movedTokenType) return false;
			// add the token type to the move so we don't have to do this again
			move.movedTokenType = movedTokenType;

			// now for the actual move logic
			const movedDistance = Game.distanceBetween(fromHex, toHex);
			if (movedDistance === 1) {
				// slide action. no more logic to check.
				return true;
			} else if (movedDistance === 2) {
				/*
				this is super nasty. a swing action is one in which the player
				"swings" around one of its own pieces. it must start next to
				a friendly piece, and finish on one of the up-to-three hexes
				on the *opposite* side of the friendly hex.

				to translate this into our code, note that any swing action
				necessarily moves the piece a distance of two.

				also notice that the hex about which we swing must be distance
				one from both the start and end hexes. we will messily implement
				this by evaluating the up-to-six hexes of distance one from the
				from hex, then testing each of them to see if 
				- they are distance one from the to hex; and
				- they are occupied by a friendly piece.
				if these conditions are met, the move is legal.
				*/
				const d1Hexes = Game.hexesOfDistanceOne(fromHex);
				for (let hex of d1Hexes) {
					if (
						Game.distanceBetween(hex, toHex) === 1 &&
						this.occupies(hex, player)
					) {
						return true;
					}
				}
				// couldn't find a hex meeting the requirements
				return false;
			} else {
				// token is trying to move on its spot or too far
				return false;
			}
		}
	}

	occupies(hex, player) {
		if (player === UPPER) {
			return Boolean(
				this.board[hex].R || this.board[hex].P || this.board[hex].S
			);
		} else {
			return Boolean(
				this.board[hex].r || this.board[hex].p || this.board[hex].s
			);
		}
	}

	static distanceBetween(hex1, hex2) {
		const [r1, q1] = hex1;
		const [r2, q2] = hex2;
		const dr = r2 - r1;
		const dq = q2 - q1;
		var distance = Math.abs(dr) + Math.abs(dq);
		// in fact, this will overshoot
		// we can also take steps "s" direction, which is equivalent to (1,-1).
		// so we should discount the distance by min(abs(dr), abs(ds)) if
		// r and s have opposite signs.
		if (Math.sign(dr) !== Math.sign(dq)) {
			const discount = Math.min(Math.abs(dr), Math.abs(dq));
			distance -= discount;
		}
		return distance;
	}

	static hexesOfDistanceOne(fromHex) {
		const [r, q] = fromHex;
		return [
			[r + 1, q],
			[r + 1, q - 1],
			[r, q - 1],
			[r, q + 1],
			[r - 1, q],
			[r - 1, q + 1],
		].filter((hex) => Game.validHex(hex));
	}

	static validHex(hex) {
		if (!hex || !hex.length || hex.length !== 2) return false;
		const [r, q] = hex;
		if (!Number.isInteger(r) || !Number.isInteger(q)) return false;
		if (r < -4 || r > 4) return false;
		let qmin = -4 - Math.min(r, 0);
		let qmax = 4 - Math.max(r, 0);
		if (q < qmin || q > qmax) return false;
		return true;
	}

	static validTokenType(tokenType, player) {
		if (player === UPPER) {
			return "RPS".includes(tokenType);
		} else if (player === LOWER) {
			return "rps".includes(tokenType);
		}
		return false;
	}

	invincible(player) {
		// test whether a player has invincible tokens
		const otherPlayer = Game.otherPlayer(player);
		if (this.nThrowsRemaining[otherPlayer] > 0) {
			// other player still has throws left!
			return false;
		}
		const ourTokenTypes = player === UPPER ? "RPS" : "rps";
		for (let tt of ourTokenTypes) {
			if (this.tokenCounts[tt]) {
				// we have one of these tokens. can it be defeated?
				var nemisis = Game.NEMISIS[tt];
				if (!this.tokenCounts[nemisis]) {
					// no! it can't!
					return true;
				}
			}
		}
		// couldn't find an invincible token.
		return false;
	}

	static otherPlayer(player) {
		return player === UPPER ? LOWER : UPPER;
	}

	executeMoves() {
		console.log("executing...");
		// move the tokens
		var toHexes = [];
		for (let move of [this.nextMoves.Lower, this.nextMoves.Upper]) {
			// the move is assumed to be legal
			const {
				player,
				throwing,
				thrownTokenType,
				fromHex,
				toHex,
				movedTokenType,
			} = move;
			// keep track of the toHexes for later
			toHexes.push(toHex);
			if (throwing) {
				this.nThrowsRemaining[player]--;
				this.tokenCounts[thrownTokenType]++;
				this.board[toHex][thrownTokenType]++;
			} else {
				this.board[fromHex][movedTokenType]--;
				this.board[toHex][movedTokenType]++;
			}
		}

		// capture tokens
		// we only need to check the toHexes
		for (let toHex of toHexes) {
			var defeated = Game.battle(this.board[toHex]);
			for (let tokenType in defeated) {
				this.tokenCounts[tokenType] -= defeated[tokenType];
				if (tokenType === tokenType.toUpperCase()) {
					// token is upper, award captures to loewr
					this.nCaptured.Lower += defeated[tokenType];
				} else {
					// award captures to upper
					this.nCaptured.Upper += defeated[tokenType];
				}
			}
		}

		// acknowledge the increase in moves (for draw-checking purposes)
		this.nMoves++;

		// save these moves as last moves
		this.lastMoves.Lower = this.nextMoves.Lower;
		this.lastMoves.Upper = this.nextMoves.Upper;
		// and clear them as the next moves, since they've now been executed
		this.nextMoves.Upper = this.nextMoves.Lower = null;

		// check endgame

		/*
		1: One player has no remaining throws and all of their tokens have been
		defeated: If the other player still has tokens or throws, declare that
		player the winner. Otherwise, declare a draw.

		This is equivalent to just checking for nCaptured == MAX_N_THROWS
		*/
		if (
			this.nCaptured.Upper === Game.MAX_N_THROWS &&
			this.nCaptured.Lower === Game.MAX_N_THROWS
		) {
			this.gameOver = true;
			this.winner = DRAW;
			return;
		}
		for (let player of [UPPER, LOWER]) {
			if (this.nCaptured[player] === Game.MAX_N_THROWS) {
				this.gameOver = true;
				this.winner = player;
				return;
			}
		}

		/*
		2: A token is *invincible* if it cannot be defeated by the opponent's
		remaining tokens, and the opponent has no remaining throws. Both players
		have an invincible token: Declare a draw.
		*/
		if (this.invincible(UPPER) && this.invincible(LOWER)) {
			this.gameOver = true;
			this.winner = DRAW;
			return;
		}

		/*
		3: One player has an invincible token an the other player has only one
		remaining token (not invincible): Declare the player with the invincible
		token the winner.
		*/
		for (let player of [UPPER, LOWER]) {
			if (this.invincible(player)) {
				// does the other player have only one token left?
				if (this.nCaptured[player] === Game.MAX_N_THROWS - 1) {
					// yes!
					this.gameOver = true;
					this.winner = player;
					return;
				}
			}
		}

		/*
		4: One game configuration (with the same number of tokens with each
		symbol and controlling player occupying each hex, and the same number
		of throws remaining for each player), occurs for a third time since the
		start of the game (not necessarily in succession): Declare a draw.
		*/

		/*
		5: The players have had their 360th turn without a winner being 
		declared: declare a draw.
		*/
		if (this.nMoves >= Game.MAX_N_MOVES) {
			this.gameOver = true;
			this.winner = DRAW;
			return;
		}
	}

	static battle(hex) {
		var hasR = hex.r || hex.R;
		var hasP = hex.p || hex.P;
		var hasS = hex.s || hex.S;
		const defeated = {
			r: 0,
			R: 0,
			p: 0,
			P: 0,
			s: 0,
			S: 0,
		};
		if (hasR) {
			// rock defeats scissors
			defeated.s = hex.s;
			defeated.S = hex.S;
			hex.s = hex.S = 0;
		}
		if (hasP) {
			// paper defeats rock somehow
			defeated.r = hex.r;
			defeated.R = hex.R;
			hex.r = hex.R = 0;
		}
		if (hasS) {
			// scissors defeats paper
			defeated.p = hex.p;
			defeated.P = hex.P;
			hex.p = hex.P = 0;
		}
		return defeated;
	}
}

// game = new Game();

// move1 = {
// 	player: "Upper",
// 	actionType: "throw",
// 	tokenType: "S",
// 	toHex: [4, -2],
// };
// game.submitMove(move1);

// move2 = {
// 	player: "Lower",
// 	actionType: "throw",
// 	tokenType: "r",
// 	toHex: [-4, 1],
// };
// game.submitMove(move2);

module.exports = Game;
