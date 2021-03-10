import React, { Component } from "react";
import { Container, Button, Form } from "react-bootstrap";

import socketIOClient from "socket.io-client";
const ENDPOINT = "/";

class Game extends Component {
	constructor(props) {
		super(props);

		// this.state = {
		// 	game: new TicTacToeGame(),
		// };

		const socket = socketIOClient(ENDPOINT);
		socket.on("connect", () => {
			console.log("Socket connected.");
		});

		this.state = {
			game: null,
			socket: socket,
			playingAs: "X",
		};

		socket.on("game", (game) => {
			this.setState({
				game: game,
			});
		});
	}

	onClickSquare(i) {
		this.state.socket.emit("move", {
			square: i,
			playingAs: this.state.playingAs,
		});
	}

	onChange = (e) => {
		switch (e.target.id) {
			case "playingX": {
				this.setState({
					playingAs: "X",
				});
				break;
			}
			case "playingO": {
				this.setState({
					playingAs: "O",
				});
				break;
			}
			default:
				break;
		}
	};

	resetGame = () => {
		this.state.socket.emit("reset game");
	};

	render() {
		const game = this.state.game;
		if (!game) {
			return <Container>Loading...</Container>;
		}
		return (
			<Container style={{ textAlign: "center" }}>
				<h1>Tic Tac Toe</h1>

				<Form>
					Playing as:
					<Form.Check
						onChange={this.onChange}
						type="radio"
						name="playingAs"
						label="X"
						id="playingX"
						defaultChecked
					/>
					<Form.Check
						onChange={this.onChange}
						type="radio"
						name="playingAs"
						label="O"
						id="playingO"
					/>
				</Form>

				<hr />
				<table id="tictactoeboard">
					<tbody>
						<tr>
							<td onClick={() => this.onClickSquare(1)} className="square">
								{this.state.game.board[1]}
							</td>
							<td onClick={() => this.onClickSquare(2)} className="square vert">
								{this.state.game.board[2]}
							</td>
							<td onClick={() => this.onClickSquare(3)} className="square">
								{this.state.game.board[3]}
							</td>
						</tr>
						<tr>
							<td onClick={() => this.onClickSquare(4)} className="square hori">
								{this.state.game.board[4]}
							</td>
							<td
								onClick={() => this.onClickSquare(5)}
								className="square vert hori"
							>
								{this.state.game.board[5]}
							</td>
							<td onClick={() => this.onClickSquare(6)} className="square hori">
								{this.state.game.board[6]}
							</td>
						</tr>
						<tr>
							<td onClick={() => this.onClickSquare(7)} className="square">
								{this.state.game.board[7]}
							</td>
							<td onClick={() => this.onClickSquare(8)} className="square vert">
								{this.state.game.board[8]}
							</td>
							<td onClick={() => this.onClickSquare(9)} className="square">
								{this.state.game.board[9]}
							</td>
						</tr>
					</tbody>
				</table>
				<hr />
				<Button variant="danger" onClick={this.resetGame}>
					Reset game
				</Button>
			</Container>
		);
	}
}

export default Game;
