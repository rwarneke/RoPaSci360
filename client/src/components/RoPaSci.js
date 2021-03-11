import React, { Component } from "react";
import { Container, ButtonGroup, ToggleButton } from "react-bootstrap";

import socketIOClient from "socket.io-client";
// const ENDPOINT = "http://localhost:5000";
const ENDPOINT = "/";

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

class Game extends Component {
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

	onClickHex = (hex) => () => {
		if ("RPSrps".includes(hex)) {
			// this is a throwing pseudo-hex
			console.log("clicked throwing hex");
			this.setState({
				fromHex: hex,
				toHex: null,
				thrownTokenType: hex,
			});
		} else {
			if (this.state.fromHex && this.state.toHex) {
				// third click
				this.setState({
					fromHex: null,
					toHex: null,
				});
			} else if (this.state.fromHex) {
				// second click.
				if (hex.toString() === this.state.fromHex.toString()) {
					// same hex as first click. cancel.
					this.setState({
						fromHex: null,
					});
				} else {
					// difference hex. treat this as the move.
					this.setState(
						{
							toHex: hex,
						},
						() => {
							this.submitMove();
						}
					);
				}
			} else {
				// first click
				this.setState({
					fromHex: hex,
				});
			}
		}
	};

	onChangePlayingAs = (e) => {
		this.setState({
			playingAs: e.target.value,
		});
	};

	tokenIsOurs = (token) => {
		if (this.state.playingAs === UPPER) {
			return "RPS".includes(token);
		} else {
			return "rps".includes(token);
		}
	};

	render() {
		var hexes = [];
		for (let r = 4; r >= -4; r--) {
			let qmin = -4 - Math.min(r, 0);
			let qmax = 4 - Math.max(r, 0);
			for (let q = qmin; q <= qmax; q++) {
				// styles
				let styleFromHex =
					this.state.fromHex &&
					[r, q].toString() === this.state.fromHex.toString()
						? { backgroundColor: "#add49b" }
						: {};
				let styleToHex =
					this.state.toHex && [r, q].toString() === this.state.toHex.toString()
						? { backgroundColor: "#ebe9a7" }
						: {};
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
									style={{ ...styleFromHex, ...styleToHex }}
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

		let throwTokens =
			this.state.playingAs === UPPER ? ["R", "P", "S"] : ["r", "p", "s"];

		return (
			<Container>
				<div>
					<ul id="hexGrid">{hexes}</ul>
					<ul id="throwHexGrid">
						{throwTokens.map((tokenType) => {
							let style =
								this.state.fromHex === tokenType
									? { backgroundColor: "#add49b" }
									: {};
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
													alt="Throw token"
												/>
											</div>
										</span>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
				<div className="center">
					<div>
						<p>
							<strong>Playing as</strong>
						</p>
					</div>
					<div>
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
				</div>
			</Container>
		);
	}
}

export default Game;
