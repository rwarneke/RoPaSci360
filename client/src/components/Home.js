import React, { Component } from "react";

import {
	Container,
	Button,
	Form,
	Col,
	Card,
	CardDeck,
	CardColumns,
} from "react-bootstrap";

// const lobbyIDRegex = new RegExp("^[0-9]{6}$");
const partialLobbyIDRegex = new RegExp("^[0-9]{0,6}$");

function randomLobby() {
	return String(Math.floor(1000000 * Math.random())).padStart(6, "0");
}

class Home extends Component {
	constructor(props) {
		super(props);

		this.state = {
			lobbyID: "",
		};
	}

	onChangeLobbyID = (e) => {
		const id = e.target.value;
		if (id.match(partialLobbyIDRegex)) {
			this.setState({
				lobbyID: e.target.value,
			});
		}
	};

	onClickGoToLobby = (e) => {
		e.preventDefault();
		if (this.state.lobbyID === "") return;
		const lobby = this.state.lobbyID.padStart(6, "0");
		window.open(`/lobby/${lobby}`);
	};

	render() {
		console.log(process.env);
		return (
			<Container id="mainContainer">
				<div className="center">
					<h1>Welcome to RoPaSci360 Online</h1>
					<div
						style={{
							margin: "2rem 0",
						}}
					>
						<Button
							variant="dark"
							size="lg"
							onClick={(e) => {
								e.preventDefault();
								window.open(`/lobby/${randomLobby()}`);
							}}
						>
							Random Lobby
						</Button>
					</div>
					<Form>
						<Form.Row className="justify-content-center">
							<Col xs="auto">
								<Form.Control
									id="inlineFormInput"
									placeholder="Lobby ID"
									style={{ width: "10rem" }}
									value={this.state.lobbyID}
									onChange={this.onChangeLobbyID}
								/>
							</Col>
							<Col xs="auto">
								<Button
									type="submit"
									style={{ width: "10rem" }}
									onClick={this.onClickGoToLobby}
								>
									Go to lobby
								</Button>
							</Col>
						</Form.Row>
					</Form>
				</div>
				<hr />
				<CardColumns>
					<Card bg={"light"} key={0} text={"dark"}>
						<Card.Header>
							<strong>There are no accounts</strong>
						</Card.Header>
						<Card.Body>
							<Card.Text>
								Games can be played by anyone at any time. There is no security
								at all.
								<hr />
								Every link of the form{" "}
								<i>ropasci360.herokuapp.com/lobby/[6 digit number]</i> contains
								a separate game, e.g.{" "}
								<a
									href="/lobby/696969"
									target="_blank"
									style={{ wordBreak: "break-all" }}
								>
									ropasci360.herokuapp.com/lobby/696969
								</a>
							</Card.Text>
						</Card.Body>
					</Card>
					<Card bg={"light"} key={0} text={"dark"}>
						<Card.Header>
							<strong>Getting set up</strong>
						</Card.Header>
						<Card.Body>
							<Card.Text>
								Go to a lobby of your choice, or click the "Random Lobby"
								button.
								<hr />
								Share the link with a friend. The system will try to
								automatically put you on opposite teams, but remember that
								anyone can control either side of any game, so you may need to
								work this out manually.
							</Card.Text>
						</Card.Body>
					</Card>
					<Card bg={"light"} key={0} text={"dark"}>
						<Card.Header>
							<strong>How to play</strong>
						</Card.Header>
						<Card.Body>
							<Card.Text>
								Despite the player names "Upper" and "Lower", the board will
								always orient with your throw tokens and first throw row at the
								bottom of the screen.
								<hr />
								No drag-and-drop; you need to click the start and end hex of
								each move.
								<hr />
								The bars on the side of the board show which rows each player
								can throw hexes onto.
								<hr />
								The score shows the number of tokens each player has captured
								(the large number) and the number of throws they have remaining
								(the small number).
							</Card.Text>
						</Card.Body>
					</Card>
				</CardColumns>
			</Container>
		);
	}
}

export default Home;
