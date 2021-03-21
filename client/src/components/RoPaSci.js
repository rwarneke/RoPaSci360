import React, { Component } from "react";
import {
	Container,
	ButtonGroup,
	ToggleButton,
	Button,
	Row,
	Col,
	Modal,
} from "react-bootstrap";
import ReactToolTip from "react-tooltip";

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

const UPPER = "Blue";
const LOWER = "Red";
const DRAW = "Draw";

const COLOUR_PALE_LOWER = "#e0b8c0";
const COLOUR_PALE_UPPER = "#b8c2e0";

const COLOUR_LOWER = "#ae213b";
const COLOUR_UPPER = "#2144ae";

const COLOUR_DRAW = "#707070";

const COLOUR_HEX_DEFAULT = "#d3d3d3";
const COLOUR_HEX_DISABLED = "#707070";
const COLOUR_HEX_FROM = "#add49b";
const COLOUR_HEX_TO = "#ebe9a7";

const scoreColours = {
	[UPPER]: COLOUR_UPPER,
	[LOWER]: COLOUR_LOWER,
};

const throwBarColours = {
	[UPPER]: COLOUR_PALE_UPPER,
	[LOWER]: COLOUR_PALE_LOWER,
};

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
				player: this.state.playingAs,
			});
		});

		this.state = {
			socket: socket,
			lobbyID: lobbyID,

			game: null,
			playingAs: UPPER,

			playingAsClash: false,

			fromHex: null,
			toHex: null,

			passnplay: false,
			toggled: false,

			modalDismissed: false,

			windowWidth: window.innerWidth,
		};

		/*
		When we receive a game update, we
		1) record the update in our version of the game
		2) reset any moves the player is attempting to submit
		3) consider showing the game over modal
		*/
		socket.on("game", (game) => {
			console.log("Game update received");
			this.setState({
				game: game,
				fromHex: null,
				toHex: null,
				toggled: false,
			});
		});

		socket.on("clash update", (data) => {
			const weAreClashing = data[this.state.playingAs];
			this.setState({
				playingAsClash: weAreClashing,
			});
		});

		socket.on("recommend playing as", (data) => {
			const { player } = data;
			this.setState({
				playingAs: player,
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
		const { playingAs, fromHex, toHex } = this.state;
		if (!fromHex || !toHex) {
			console.log("Tried to submit move without one selected");
		}
		const move = { player: playingAs, fromHex, toHex };
		console.log("Submitting", move);
		this.state.socket.emit("move", {
			lobbyID: this.state.lobbyID,
			nMovesObserved: this.state.game.nMoves,
			move,
		});

		// toggle the player if we haven't since the last board and pass and play is activated
		if (this.state.passnplay && !this.state.toggled) {
			// wait a brief moment beforehand so that the player feels that they've genuinely made a move
			sleep(200).then(() => {
				this.togglePlayer();
			});
		}
	};

	togglePlayer = () => {
		this.setState({
			playingAs: Game.otherPlayer(this.state.playingAs),
			fromHex: null,
			toHex: null,
			toggled: true,
		});
		this.state.socket.emit("playing as", {
			lobbyID: this.state.lobbyID,
			player: this.state.playingAs,
		});
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
			nMovesObserved: this.state.game.nMoves,
		});
	};

	newGame = () => {
		console.log("Resetting game");
		const { lobbyID } = this.state;
		this.state.socket.emit("reset game", {
			lobbyID,
		});
		this.setState({
			game: null,
			modalDismissed: false,
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
			let nThrowsTaken = this.state.game.nThrowsTaken[us];
			let n = nThrowsTaken + 1;
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
		].filter((hex) => Game.validBoardHex(hex));
	}

	static validBoardHex(hex) {
		// must be a 2-list somewhere on the 61-hex RoPaSci 360 board.
		if (!hex || !hex.length || hex.length !== 2) return false;
		const [r, q] = hex;
		if (!Number.isInteger(r) || !Number.isInteger(q)) return false;
		if (r < -4 || r > 4) return false;
		let qmin = -4 - Math.min(r, 0);
		let qmax = 4 - Math.max(r, 0);
		if (q < qmin || q > qmax) return false;
		return true;
	}

	static validThrowHex(hex, player) {
		// must be a rock, paper, or scissors of either upper or lower
		if (!player) return "RPSrps".includes(hex);
		if (player === UPPER) return "RPS".includes(hex);
		if (player === LOWER) return "rps".includes(hex);
		return undefined;
	}

	static validBoardOrThrowHex(hex) {
		// from hexes are allowed to be throwing hexes
		return Game.validFromHex(hex) || Game.validThrowHex(hex);
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
		var style = { backgroundColour: COLOUR_HEX_DEFAULT };
		const { game, fromHex, toHex, playingAs } = this.state;
		if (!game) {
			return style;
		}

		for (let player of [UPPER, LOWER]) {
			if (Game.validThrowHex(hex, player)) {
				const playerHasThrowsLeft = game.nThrowsRemaining[player] > 0;
				if (!playerHasThrowsLeft) {
					style.backgroundColor = COLOUR_HEX_DISABLED;
				}
			}
		}

		if (equal(hex, fromHex)) {
			style.backgroundColor = COLOUR_HEX_FROM;
		} else if (equal(hex, toHex)) {
			style.backgroundColor = COLOUR_HEX_TO;
		} else {
			/*
			only now that we're sure we aren't working with a selected hex will
			we consider highlighting it as a last-move hex
			*/
			const lowerHex = Boolean(
				game.lastMoves.Lower &&
					(equal(hex, game.lastMoves.Lower.toHex) ||
						equal(hex, game.lastMoves.Lower.fromHex))
			);
			const upperHex = Boolean(
				game.lastMoves.Upper &&
					(equal(hex, game.lastMoves.Upper.toHex) ||
						equal(hex, game.lastMoves.Upper.fromHex))
			);
			if (lowerHex && upperHex) {
				// both players moved here
				// need to half-n-half it
				// they will be on the top, we will be on the bottom

				var topColour, bottomColour;
				if (playingAs === UPPER) {
					topColour = COLOUR_PALE_LOWER;
					bottomColour = COLOUR_PALE_UPPER;
				} else {
					topColour = COLOUR_PALE_UPPER;
					bottomColour = COLOUR_PALE_LOWER;
				}

				style.background = `linear-gradient(0deg, ${bottomColour} 50%, ${topColour} 50%`;
			} else if (lowerHex) {
				style.backgroundColor = COLOUR_PALE_LOWER;
			} else if (upperHex) {
				style.backgroundColor = COLOUR_PALE_UPPER;
			}
		}
		return style;
	};

	onClickHex = (hex) => () => {
		const { game, fromHex, toHex, playingAs } = this.state;
		if (!game || game.gameOver) return;
		if (Game.validThrowHex(hex)) {
			// clicked on a throw hex

			// must have throws remaining
			if (game.nThrowsRemaining[playingAs] === 0) return;

			if (this.state.fromHex === hex) {
				// same as first click
				// undo it
				this.setState({
					fromHex: null,
				});
			} else {
				// different to first click
				// overwrite it
				if (this.legalFromHex(hex)) {
					this.setState({
						fromHex: hex,
						toHex: null,
						thrownTokenType: hex,
					});
				}
			}
		} else {
			if (fromHex && !toHex) {
				// second click
				if (equal(hex, fromHex)) {
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
				} else {
					// illegal move. cancel move.
					this.setState({
						fromHex: null,
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
			playingAsClash: false, // assume the best for now
		});
		this.state.socket.emit("playing as", {
			lobbyID: this.state.lobbyID,
			player: e.target.value,
		});
	};

	dismissModal = () => {
		this.setState({
			modalDismissed: true,
		});
	};

	tokenIsOurs = (token) => {
		if (this.state.playingAs === UPPER) {
			return "RPS".includes(token);
		} else {
			return "rps".includes(token);
		}
	};

	gameOverModal = () => {
		const { game, modalDismissed } = this.state;
		if (!game) return null;

		var titleMessage = "";
		var subtitleMessage = "";
		var bg = null;
		if (game.gameOver) {
			titleMessage = game.winner === DRAW ? "Draw" : `${game.winner} Wins`;
			subtitleMessage = `by ${game.gameOverReason}`;
			switch (game.winner) {
				case UPPER:
					bg = COLOUR_UPPER;
					break;
				case LOWER:
					bg = COLOUR_LOWER;
					break;
				case DRAW:
					bg = COLOUR_DRAW;
					break;
				default:
					bg = null;
					break;
			}
		}
		return (
			<Modal
				show={game && game.gameOver && !modalDismissed}
				onHide={this.dismissModal}
				id="gameOverModal"
				aria-labelledby="contained-modal-title-vcenter"
				size="lg"
				centered
			>
				<Modal.Header style={{ backgroundColor: bg, color: "white" }}>
					<span style={{ width: "100%" }} className="text-center">
						<div>
							<h3>
								<strong>{titleMessage}</strong>
							</h3>
						</div>
						<div>{subtitleMessage}</div>
					</span>
				</Modal.Header>
				<Modal.Body>
					<Button
						variant="warning"
						onClick={() => {
							this.newGame();
							this.dismissModal();
						}}
						className="standardButton"
					>
						Reset game
					</Button>
					<Button
						variant="secondary"
						style={{ float: "right" }}
						className="standardButton"
						onClick={this.dismissModal}
					>
						Dismiss
					</Button>
				</Modal.Body>
			</Modal>
		);
	};

	render() {
		var boardHexes = [];
		const { game, playingAs, passnplay, windowWidth } = this.state;
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
				if (game) {
					let hexContent = game.board[[r, q]];
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
				const shift = Math.min(0.8, 3.2 / n);
				if (n > 0) {
					// do their tokens first so that ours appear on top
					for (let i = 0; i < theirTokens.count; i++) {
						tokenImages.push(
							<img
								key={[r, q, i]}
								src={TOKEN_IMG_PATH[theirTokens.tokenType]}
								alt={`token ${theirTokens.tokenType}`}
								width="60%"
								style={{ marginTop: `${(i - (n - 1) / 2) * shift}rem` }}
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
								style={{ marginTop: `${(i - (n - 1) / 2) * shift}rem` }}
							/>
						);
					}
				}
				// html
				boardHexes.push(
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
		if (playingAs === UPPER) {
			boardHexes.reverse();
		}

		let ourThrowTokens =
			playingAs === UPPER ? ["R", "P", "S"] : ["r", "p", "s"];
		let theirThrowTokens =
			playingAs === UPPER ? ["r", "p", "s"] : ["R", "P", "S"];

		let ourThrowHexGrid = ourThrowTokens.map((tokenType) => {
			return (
				<li className="hex" key={"throw-" + tokenType}>
					<div className="hexIn">
						<span className="hexContentOuter">
							<div
								className="hexContentInner"
								style={this.calculateStyle(tokenType)}
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
							<div
								className="hexContentInner"
								style={this.calculateStyle(tokenType)}
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

		const message = game ? `Moves: ${game.nMoves}` : "";

		const throwBarStyles = {};
		[UPPER, LOWER].forEach((player) => {
			const backgroundColor = throwBarColours[player];
			var height;
			if (!game) {
				height = "0";
			} else {
				const nThrows = game.nThrowsTaken[player];
				const n = nThrows + 1;
				const nThrowsRemaining = game.nThrowsRemaining[player];
				if (nThrowsRemaining === 0) {
					height = 0;
				} else {
					height = `${((3 * n) / 28) * 100}%`;
				}
			}
			throwBarStyles[player] = {
				backgroundColor,
				height,
			};
		});

		const scoreComponents = {};
		[UPPER, LOWER].forEach((player) => {
			const style = {
				color: scoreColours[player],
			};
			const score = this.state.game ? this.state.game.nCaptured[player] : 0;
			const remThrows = this.state.game
				? this.state.game.nThrowsRemaining[player]
				: "";
			const invincible = this.invincible(player) ? "Invincible" : "";
			const JSXElements = [
				<div
					style={style}
					key="pscore"
					className="playerScore"
					data-tip="Captures"
				>
					{score}
				</div>,
				<div
					style={style}
					key="premthrows"
					className="playerRemThrows"
					data-tip="Remaining throws"
				>
					{remThrows}
				</div>,
				<div style={style} key="pinvinc" className="playerInvincible">
					{invincible}
				</div>,
			];
			scoreComponents[player] = JSXElements;
		});

		const board = (
			<div id="board" onClick={this.onBoardClick}>
				<ul id="throwHexGrid">{theirThrowHexGrid}</ul>
				<ul id="hexGrid">
					{boardHexes}
					<div
						id="leftThrowBar"
						data-tip="Rows your opponent can throw on"
						data-place="top"
						style={throwBarStyles[Game.otherPlayer(playingAs)]}
					></div>
					<div
						id="rightThrowBar"
						data-tip="Rows you can throw on"
						data-place="bottom"
						style={throwBarStyles[playingAs]}
					></div>
				</ul>
				<ul id="throwHexGrid">{ourThrowHexGrid}</ul>
			</div>
		);

		const gameControls = (
			<div className="center" id="gameControlsInner">
				<div>
					<div id="playingAsClashNotification">
						{this.state.playingAsClash ? (
							<>
								Someone else in this lobby is also playing as{" "}
								{this.state.playingAs}.
							</>
						) : null}
					</div>
					<span>Playing as </span>
					<ButtonGroup toggle>
						<ToggleButton
							key="blue"
							value={UPPER}
							type="radio"
							variant="outline-dark"
							checked={playingAs === UPPER}
							onChange={this.onChangePlayingAs}
							style={{
								width: "4rem",
							}}
							className="standardButton"
						>
							Blue
						</ToggleButton>
						<ToggleButton
							key="red"
							value={LOWER}
							type="radio"
							variant="outline-dark"
							checked={playingAs === LOWER}
							onChange={this.onChangePlayingAs}
							style={{
								width: "4rem",
							}}
							className="standardButton"
						>
							Red
						</ToggleButton>
					</ButtonGroup>
				</div>
				<div>
					<span>Pass-n-Play </span>
					<ButtonGroup toggle>
						<ToggleButton
							type="checkbox"
							variant="outline-dark"
							checked={passnplay}
							onChange={() => {
								this.setState({
									passnplay: !passnplay,
								});
								if (this.state.fromHex && this.state.toHex) {
									this.togglePlayer();
								}
							}}
							style={{
								width: "3rem",
							}}
							className="standardButton"
						>
							{passnplay ? "On" : "Off"}
						</ToggleButton>
					</ButtonGroup>
				</div>
				<div>
					<Button
						variant="warning"
						onClick={this.newGame}
						className="standardButton"
					>
						Reset game
					</Button>
				</div>
				<div id="message-banner" className="centerVertically">
					{message}
				</div>
			</div>
		);

		if (windowWidth < 576) {
			// things look very different on mobile
			return (
				<Container id="gameContainerXS">
					<ReactToolTip effect="solid" place="top" />
					{this.gameOverModal()}
					<h2 className="center">
						RoPaSci360 Online (Lobby {this.state.lobbyID})
					</h2>
					<hr />
					<Row>
						<Col xs={6}>
							<div id="topScoreXS" className="center">
								{scoreComponents[Game.otherPlayer(playingAs)]}
							</div>
						</Col>
						<Col xs={6}>
							<div id="bottomScoreXS" className="center">
								{scoreComponents[playingAs]}
							</div>
						</Col>
					</Row>
					<div id="board-wrapper">{board}</div>
					<hr />
					{gameControls}
				</Container>
			);
		} else {
			document.body.style = "background: rgb(177, 138, 100);";
			return (
				<div id="contentContainer">
					<ReactToolTip effect="solid" place="left" />
					<div id="gameContainer">
						{this.gameOverModal()}
						<h2 className="center">
							RoPaSci360 Online (Lobby {this.state.lobbyID})
						</h2>
						<hr />
						<Row>
							<Col sm={8} id="board-wrapper">
								{board}
							</Col>
							<Col sm={4} id="game-meta-wrapper" className="centerVertically">
								<div id="topScore" className="center">
									{scoreComponents[Game.otherPlayer(playingAs)]}
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
									{scoreComponents[playingAs].reverse()}
								</div>
							</Col>
						</Row>
					</div>
				</div>
			);
		}
	}
}

export default Game;
