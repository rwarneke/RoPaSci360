import React, { Component } from "react";
import {
	Container,
	ButtonGroup,
	ToggleButton,
	Button,
	Row,
	Col,
} from "react-bootstrap";

import socketIOClient from "socket.io-client";
const ENDPOINT = "/";
// const ENDPOINT = "http://localhost:5000";

const TOKEN_IMG_PATH = {
	r: "/images/token-r-lower.png",
	p: "/images/token-p-lower.png",
	s: "/images/token-s-lower.png",
	R: "/images/token-r-upper.png",
	P: "/images/token-p-upper.png",
	S: "/images/token-s-upper.png",
};

const UPPER = "Upper";
const LOWER = "Lower";

const LAST_MOVE_TOHEX_LOWER = "#e0b8c0";
const LAST_MOVE_TOHEX_UPPER = "#ababab";

// const sleep = (milliseconds) => {
// 	return new Promise((resolve) => setTimeout(resolve, milliseconds));
// };

function equal(hex1, hex2) {
	if (hex1 === hex2) return true;
	if (!hex1 || !hex2) return false;
	return hex1.toString() === hex2.toString();
}

function otherPlayer(player) {
	if (player === UPPER) return LOWER;
	if (player === LOWER) return UPPER;
	return undefined;
}

class Game extends Component {
	static MAX_N_THROWS = 9;

	constructor(props) {
		super(props);

		const socket = socketIOClient(ENDPOINT);
		socket.on("connect", () => {
			console.log("socket connected");
		});

		this.state = {
			game: null,
			socket: socket,
			playingAs: UPPER,
			fromHex: null,
			toHex: null,
			thrownTokenType: null,
		};

		socket.on("game", (game) => {
			console.log("Game update received");
			this.setState({
				game: game,
				fromHex: null,
				toHex: null,
			});
		});
	}

	submitMove = () => {
		var move;
		if ("RPSrps".includes(this.state.fromHex)) {
			move = {
				player: this.state.playingAs,
				throwing: true,
				thrownTokenType: this.state.thrownTokenType,
				toHex: this.state.toHex,
			};
		} else {
			move = {
				player: this.state.playingAs,
				throwing: false,
				fromHex: this.state.fromHex,
				toHex: this.state.toHex,
			};
		}
		console.log("Submitting", move);
		this.state.socket.emit("move", move);
	};

	onBoardClick = () => {
		if (this.state.fromHex && this.state.toHex) {
			// a move was selected and the player clicked the board
			// treat this as a cancellation of the move, no matter what
			this.cancelMove();
		}
	};

	weOccupy = (hex) => {
		if (!this.state.game) return undefined;
		const tokens = this.state.game.board[hex];
		if (this.state.playingAs === UPPER) {
			return Boolean(tokens.R || tokens.P || tokens.S);
		} else {
			return Boolean(tokens.r || tokens.p || tokens.s);
		}
	};

	legalFromHex = (hex) => {
		if ("RPSrps".includes(hex)) {
			// this is a throwing hex
			// that should be enough, but lets just make sure they didn't
			// somehow select the opponents throwing hex
			return this.tokenIsOurs(hex);
		} else {
			// this is a regular hex
			// we just need to have a token on it
			return this.weOccupy(hex);
		}
	};

	legalToHex = (toHex) => {
		if (!this.state.game) return undefined;
		const fromHex = this.state.fromHex;
		const us = this.state.playingAs;
		if (!fromHex) {
			// we should never end up here
			console.log("why did we end up here?");
			return false;
		}
		if ("RPSrps".includes(fromHex)) {
			// this is a throw
			// needs to be on first n rows
			let r = toHex[0];
			let row = us === UPPER ? 5 - r : 5 + r;
			let nThrowsTaken =
				Game.MAX_N_THROWS - this.state.game.nThrowsRemaining[us];
			let n = nThrowsTaken + 1;
			console.log(row, n);
			return row <= n;
		} else {
			// this is not a throw
			const movedDistance = Game.distanceBetween(fromHex, toHex);
			if (movedDistance === 1) {
				// slide
				return true;
			} else if (movedDistance === 2) {
				// see the backend version of this stuff for comments idk
				const d1Hexes = Game.hexesOfDistanceOne(fromHex);
				for (let hex of d1Hexes) {
					if (Game.distanceBetween(hex, toHex) === 1 && this.weOccupy(hex)) {
						return true;
					}
				}
				return false;
			} else {
				return false;
			}
		}
	};

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

	cancelMove = () => {
		this.setState({
			fromHex: null,
			toHex: null,
		});
		console.log("Cancelling move");
		this.state.socket.emit("cancel move", this.state.playingAs);
	};

	calculateStyle = (hex) => {
		var style = {};
		if (equal(hex, this.state.fromHex)) {
			style.backgroundColor = "#add49b";
		} else if (equal(hex, this.state.toHex)) {
			style.backgroundColor = "#ebe9a7";
		} else {
			/*
			only now that we're sure we aren't working with a selected hex will
			we consider highlighting it as a last-move hex
			*/
			const lowerEndHex = Boolean(
				this.state.game &&
					this.state.game.lastMoves.Lower &&
					equal(hex, this.state.game.lastMoves.Lower.toHex)
			);
			const upperEndHex = Boolean(
				this.state.game &&
					this.state.game.lastMoves.Upper &&
					equal(hex, this.state.game.lastMoves.Upper.toHex)
			);
			if (lowerEndHex && upperEndHex) {
				// both players moved here
				// need to half-n-half it
				// they will be on the top, we will be on the bottom

				var topColour, bottomColour;
				if (this.state.playingAs === UPPER) {
					topColour = LAST_MOVE_TOHEX_LOWER;
					bottomColour = LAST_MOVE_TOHEX_UPPER;
				} else {
					topColour = LAST_MOVE_TOHEX_UPPER;
					bottomColour = LAST_MOVE_TOHEX_LOWER;
				}

				style.background = `linear-gradient(0deg, ${bottomColour} 50%, ${topColour} 50%`;
			} else if (lowerEndHex) {
				style.backgroundColor = LAST_MOVE_TOHEX_LOWER;
			} else if (upperEndHex) {
				style.backgroundColor = LAST_MOVE_TOHEX_UPPER;
			}
		}
		return style;
	};

	onClickHex = (hex) => () => {
		const hexIsThrowHex = "RPSrps".includes(hex);
		if (hexIsThrowHex) {
			if (this.state.fromHex === hex) {
				this.setState({
					fromHex: null,
				});
			} else {
				if (this.legalFromHex(hex)) {
					this.setState({
						fromHex: hex,
						toHex: null,
						thrownTokenType: hex,
					});
				}
			}
		} else {
			if (this.state.fromHex && !this.state.toHex) {
				// second click.
				if (equal(hex, this.state.fromHex)) {
					// same hex as first click. cancel.
					this.setState({
						fromHex: null,
					});
				} else {
					// different hex. treat this as the move.
					if (this.legalToHex(hex)) {
						// must finish setting state before submitting move
						this.setState(
							{
								toHex: hex,
							},
							() => {
								this.submitMove();
							}
						);
					}
				}
			} else {
				// first click
				if (this.legalFromHex(hex)) {
					this.setState({
						fromHex: hex,
					});
				}
			}
		}
	};

	onChangePlayingAs = (e) => {
		this.setState({
			playingAs: e.target.value,
			fromHex: null,
			toHex: null,
		});
	};

	tokenIsOurs = (token) => {
		if (this.state.playingAs === UPPER) {
			return "RPS".includes(token);
		} else {
			return "rps".includes(token);
		}
	};

	gameMetaJSX = (player, top) => {
		const style =
			player === UPPER ? { color: "#000000" } : { color: "#ae213b" };
		const score = this.state.game ? this.state.game.nCaptured[player] : 0;
		const remThrows = this.state.game
			? this.state.game.nThrowsRemaining[player]
			: "";
		const JSXElements = [
			<div className="playerScore">{score}</div>,
			<div className="playerRemThrows">{remThrows}</div>,
		];
		if (!top) JSXElements.reverse();
		return <span style={style}>{JSXElements}</span>;
	};

	render() {
		var hexes = [];
		for (let r = 4; r >= -4; r--) {
			let qmin = -4 - Math.min(r, 0);
			let qmax = 4 - Math.max(r, 0);
			for (let q = qmin; q <= qmax; q++) {
				// // styles
				// let styleFromHex =
				// 	this.state.fromHex &&
				// 	[r, q].toString() === this.state.fromHex.toString()
				// 		? { backgroundColor: "#add49b" }
				// 		: {};
				// let styleToHex =
				// 	this.state.toHex && [r, q].toString() === this.state.toHex.toString()
				// 		? { backgroundColor: "#ebe9a7" }
				// 		: {};
				// tokens
				var ourTokens = {
					tokenType: null,
					count: 0,
				};
				var theirTokens = {
					tokenType: null,
					count: 0,
				};
				if (this.state.game) {
					let hexContent = this.state.game.board[[r, q]];
					for (let tt in hexContent) {
						if (hexContent[tt]) {
							if (this.tokenIsOurs(tt)) {
								ourTokens.tokenType = tt;
								ourTokens.count = hexContent[tt];
							} else {
								theirTokens.tokenType = tt;
								theirTokens.count = hexContent[tt];
							}
							// let src = TOKEN_IMG_PATH[tt];
							// img = <img src={src} width="60%" alt={`token ${tt}`} />;
							// break;
						}
					}
				}
				let n = ourTokens.count + theirTokens.count;
				var tokenImages = [];
				if (n > 0) {
					// do their tokens first so that ours appear on top
					for (let i = 0; i < theirTokens.count; i++) {
						tokenImages.push(
							<img
								key={[r, q, i]}
								src={TOKEN_IMG_PATH[theirTokens.tokenType]}
								alt={`token ${theirTokens.tokenType}`}
								width="60%"
								style={{ marginTop: `${(i - (n - 1) / 2) * 0.8}rem` }}
							/>
						);
					}
					for (let i = theirTokens.count; i < n; i++) {
						tokenImages.push(
							<img
								key={[r, q, i]}
								src={TOKEN_IMG_PATH[ourTokens.tokenType]}
								alt={`token ${ourTokens.tokenType}`}
								width="60%"
								style={{ marginTop: `${(i - (n - 1) / 2) * 0.8}rem` }}
							/>
						);
					}
				}
				// html
				hexes.push(
					<li className="hex" key={[r, q]}>
						<div className="hexIn">
							<span className="hexContentOuter">
								<div
									className="hexContentInner"
									style={this.calculateStyle([r, q])}
									onClick={this.onClickHex([r, q])}
								>
									{tokenImages}
								</div>
							</span>
						</div>
					</li>
				);
			}
		}

		// invert the orientation for upper
		if (this.state.playingAs === UPPER) {
			hexes.reverse();
		}

		let ourThrowTokens =
			this.state.playingAs === UPPER ? ["R", "P", "S"] : ["r", "p", "s"];
		let theirThrowTokens =
			this.state.playingAs === UPPER ? ["r", "p", "s"] : ["R", "P", "S"];

		let ourThrowHexGrid = ourThrowTokens.map((tokenType) => {
			let style =
				this.state.fromHex === tokenType ? { backgroundColor: "#add49b" } : {};
			return (
				<li className="hex" key={"throw-" + tokenType}>
					<div className="hexIn">
						<span className="hexContentOuter">
							<div
								className="hexContentInner"
								style={style}
								onClick={this.onClickHex(tokenType)}
							>
								<img
									src={TOKEN_IMG_PATH[tokenType]}
									width="60%"
									alt={`Throw token ${tokenType}`}
								/>
							</div>
						</span>
					</div>
				</li>
			);
		});

		let theirThrowHexGrid = theirThrowTokens.map((tokenType) => {
			return (
				<li className="hex" key={"throw-" + tokenType}>
					<div className="hexIn">
						<span className="hexContentOuter">
							<div className="hexContentInner">
								<img
									src={TOKEN_IMG_PATH[tokenType]}
									width="60%"
									alt={`Throw token ${tokenType}`}
								/>
							</div>
						</span>
					</div>
				</li>
			);
		});

		var winnerMessage = "";
		if (this.state.game && this.state.game.gameOver) {
			const winner = this.state.game.winner;
			if (winner === "Draw") {
				winnerMessage = "Game over. It's a draw!";
			} else {
				winnerMessage = `Game over. ${winner} wins!`;
			}
		}

		return (
			<Container style={{ marginTop: "1rem" }} id="gameContainer">
				<Row>
					<Col sm={8} id="board-wrapper">
						<div id="board" onClick={this.onBoardClick}>
							<ul id="throwHexGrid">{theirThrowHexGrid}</ul>
							<ul id="hexGrid">{hexes}</ul>
							<ul id="throwHexGrid">{ourThrowHexGrid}</ul>
						</div>
					</Col>
					<Col sm={4} id="game-meta-wrapper" className="centerVertically">
						<div id="topScore" className="center">
							{this.gameMetaJSX(otherPlayer(this.state.playingAs), true)}
						</div>
						<div className="centerVertically" style={{ width: "100%" }}>
							<div className="center" style={{ width: "100%" }}>
								<div>
									<hr />
									<ButtonGroup toggle>
										<ToggleButton
											key="upper"
											value={UPPER}
											type="radio"
											variant="outline-dark"
											checked={this.state.playingAs === UPPER}
											onChange={this.onChangePlayingAs}
										>
											Upper
										</ToggleButton>
										<ToggleButton
											key="lower"
											value={LOWER}
											type="radio"
											variant="outline-danger"
											checked={this.state.playingAs === LOWER}
											onChange={this.onChangePlayingAs}
										>
											Lower
										</ToggleButton>
									</ButtonGroup>
								</div>
								<div id="winner-banner" className="centerVertically">
									{winnerMessage}
								</div>
								<div>
									<Button
										variant="outline-info"
										onClick={() => {
											this.state.socket.emit("reset game");
										}}
									>
										New game
									</Button>
								</div>
								<hr />
							</div>
						</div>
						<div id="bottomScore" className="center">
							{this.gameMetaJSX(this.state.playingAs, false)}
						</div>
					</Col>
				</Row>
			</Container>
		);
	}
}

export default Game;
