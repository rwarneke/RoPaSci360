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
	r: `${process.env.PUBLIC_URL}/images/token-r-lower.png`,
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

const sleep = (milliseconds) => {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

function equal(hex1, hex2) {
	if (hex1 === hex2) return true;
	if (!hex1 || !hex2) return false;
	return hex1.toString() === hex2.toString();
}

class Game extends Component {
	static MAX_N_THROWS = 9;

	static NEMISIS = {
		r: "P",
		p: "S",
		s: "R",
		R: "p",
		P: "s",
		S: "r",
	};

	constructor(props) {
		super(props);
		const lobbyID = this.props.match.params.lobbyID;

		const socket = socketIOClient(ENDPOINT);
		socket.on("connect", () => {
			// console.log("socket connected");
			socket.emit("inform lobby id", {
				lobbyID,
			});
		});

		this.state = {
			socket: socket,
			lobbyID: lobbyID,

			game: null,
			playingAs: UPPER,
			fromHex: null,
			toHex: null,
			thrownTokenType: null,
			windowWidth: window.innerWidth,
			passnplay: false,
			toggled: false,
		};

		socket.on("game", (game) => {
			console.log("Game update received");
			this.setState({
				game: game,
				fromHex: null,
				toHex: null,
				toggled: false,
			});
		});
	}

	handleResize = (e) => {
		this.setState({
			windowWidth: window.innerWidth,
		});
	};

	componentDidMount() {
		window.addEventListener("resize", this.handleResize);
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.handleResize);
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
		this.state.socket.emit("move", {
			lobbyID: this.state.lobbyID,
			move,
		});

		// toggle the player if we haven't since the last board and pass and play is activated
		if (this.state.passnplay && !this.state.toggled) {
			sleep(200).then(() => {
				this.setState({
					playingAs: Game.otherPlayer(this.state.playingAs),
					fromHex: null,
					toHex: null,
					toggled: true,
				});
			});
		}
	};

	cancelMove = () => {
		this.setState({
			fromHex: null,
			toHex: null,
		});
		console.log("Cancelling move");
		this.state.socket.emit("cancel move", {
			lobbyID: this.state.lobbyID,
			player: this.state.playingAs,
		});
	};

	newGame = () => {
		console.log("Resetting game");
		const { lobbyID } = this.state;
		this.state.socket.emit("reset game", {
			lobbyID,
		});
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

	static otherPlayer = (player) => {
		if (player === UPPER) return LOWER;
		if (player === LOWER) return UPPER;
		return undefined;
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

	invincible = (player) => {
		const otherPlayer = Game.otherPlayer(player);
		const game = this.state.game;
		if (!game) return undefined;
		if (game.nThrowsRemaining[otherPlayer] > 0) return false;
		const ourTokenTypes = player === UPPER ? "RPS" : "rps";
		for (let tt of ourTokenTypes) {
			if (game.tokenCounts[tt]) {
				var nemisis = Game.NEMISIS[tt];
				if (!game.tokenCounts[nemisis]) {
					return true;
				}
			}
		}
		return false;
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
		if (!this.state.game || this.state.game.gameOver) return;
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
				} else if (this.legalToHex(hex)) {
					// legal move. treat it as one.
					this.setState({ toHex: hex }, () => {
						this.submitMove();
					});
				} else if (this.legalFromHex(hex)) {
					// player is probably trying to restart their move
					this.setState({
						fromHex: hex,
					});
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

	// create the JSX for the game meta describing a players score
	playerMetaJSX = (player, top) => {
		const style =
			player === UPPER ? { color: "#000000" } : { color: "#ae213b" };
		const score = this.state.game ? this.state.game.nCaptured[player] : 0;
		const remThrows = this.state.game
			? this.state.game.nThrowsRemaining[player]
			: "";
		const invincible = this.invincible(player) ? "Invincible" : "";
		const JSXElements = [
			<div key="pscore" className="playerScore">
				{score}
			</div>,
			<div key="premthrows" className="playerRemThrows">
				{remThrows}
			</div>,
			<div key="pinvinc" className="playerInvincible">
				{invincible}
			</div>,
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

		var message = "";
		if (this.state.game) {
			if (this.state.game.gameOver) {
				const winner = this.state.game.winner;
				if (winner === "Draw") {
					message = "Game over. It's a draw!";
				} else {
					message = `Game over. ${winner} wins!`;
				}
			} else {
				const nMoves = this.state.game.nMoves;
				message = `Moves: ${nMoves}`;
			}
		}

		const board = (
			<div id="board" onClick={this.onBoardClick}>
				<ul id="throwHexGrid">{theirThrowHexGrid}</ul>
				<ul id="hexGrid">{hexes}</ul>
				<ul id="throwHexGrid">{ourThrowHexGrid}</ul>
			</div>
		);

		const topScore = this.playerMetaJSX(
			Game.otherPlayer(this.state.playingAs),
			true
		);
		const bottomScore = this.playerMetaJSX(this.state.playingAs, false);

		const gameControls = (
			<div className="center">
				<div>
					<ButtonGroup toggle>
						<ToggleButton
							key="upper"
							value={UPPER}
							type="radio"
							variant="outline-dark"
							checked={this.state.playingAs === UPPER}
							onChange={this.onChangePlayingAs}
							style={{
								width: "5rem",
							}}
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
							style={{
								width: "5rem",
							}}
						>
							Lower
						</ToggleButton>
					</ButtonGroup>
				</div>
				<div>
					<strong>Pass-n-Play </strong>
					<ButtonGroup toggle>
						<ToggleButton
							type="checkbox"
							variant="outline-secondary"
							checked={this.state.passnplay}
							onChange={() => {
								this.setState({
									passnplay: !this.state.passnplay,
								});
							}}
							style={{
								width: "3rem",
							}}
						>
							{this.state.passnplay ? "On" : "Off"}
						</ToggleButton>
					</ButtonGroup>
				</div>
				<div>
					<Button variant="warning" onClick={this.newGame}>
						Reset game
					</Button>
				</div>
				<div id="message-banner" className="centerVertically">
					{message}
				</div>
			</div>
		);

		if (this.state.windowWidth < 576) {
			// things look very different on mobile
			return (
				<Container id="gameContainerXS">
					<h1 className="center">RoPaSci360 Online</h1>
					<hr />
					<div id="topScoreXS" className="center">
						{topScore}
					</div>
					<div id="board-wrapper">{board}</div>
					<div id="bottomScoreXS" className="center">
						{bottomScore}
					</div>
					<hr />
					{gameControls}
				</Container>
			);
		} else {
			return (
				<Container id="gameContainer">
					<h1 className="center">RoPaSci360 Online</h1>
					<hr />
					<Row>
						<Col sm={8} id="board-wrapper">
							{board}
						</Col>
						<Col sm={4} id="game-meta-wrapper" className="centerVertically">
							<div id="topScore" className="center">
								{topScore}
							</div>
							<div
								className="centerVertically"
								id="gameControls"
								style={{ width: "100%" }}
							>
								<div style={{ width: "100%" }}>
									<hr />
									{gameControls}
									<hr />
								</div>
							</div>
							<div id="bottomScore" className="center">
								{bottomScore}
							</div>
						</Col>
					</Row>
				</Container>
			);
		}
	}
}

export default Game;
