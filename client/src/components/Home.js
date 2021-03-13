import React, { Component } from "react";

import { Container, Button } from "react-bootstrap";

function randomLobby() {
	return String(Math.floor(1000000 * Math.random())).padStart(6, "0");
}

class Home extends Component {
	constructor(props) {
		super(props);

		this.state = {
			lobbyToRedirect: randomLobby(),
		};
	}

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
							href={`/lobby/${this.state.lobbyToRedirect}`}
							target="_blank"
							onClick={() => {
								this.setState({
									lobbyToRedirect: randomLobby(),
								});
							}}
						>
							Random Lobby
						</Button>
					</div>
				</div>
				<hr />
				<div id="instructions">
					<h3>Instructions</h3>
					<ul>
						<li>There are no accounts or sessions</li>
						<ul>
							<li>
								Games can be played by anyone at any time. There is no security
								at all.
							</li>
							<li>
								Every link of the form{" "}
								<i>ropasci360.herokuapp.com/lobby/[6 digit number]</i> contains
								a unique game.
								<ul>
									<li>
										Example:{" "}
										<a href="/lobby/696969" target="_blank">
											ropasci360.herokuapp.com/lobby/696969
										</a>
									</li>
								</ul>
							</li>
						</ul>
						<li>How to play</li>
						<ul>
							<li>
								Go to a lobby of your choice, or click the "Random" button to
								access a random lobby.
								<ul>
									<li>
										In case you're wondering, yes, the "Random Lobby" button{" "}
										<i>could</i> put you in a lobby with a game already running.
										I decided not to fix this, since the awfully structured
										backend of this app will almost certainly crash long before
										it's at all probable.
									</li>
								</ul>
							</li>
							<li>
								Share the link with a friend. You'll have to agree on who will
								play as Upper and who will play as Lower.
								<ul>
									<li>
										If you don't have any friends, the Pass-n-Play option makes
										playing with yourself a little easier.
									</li>
								</ul>
							</li>
						</ul>
					</ul>
				</div>
			</Container>
		);
	}
}

export default Home;
