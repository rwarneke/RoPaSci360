import React, { Component } from "react";
import socketIOClient from "socket.io-client";
const ENDPOINT = "http://localhost:5000";

class Chat extends Component {
	constructor(props) {
		super(props);

		this.state = {
			messages: [],
		};

		const socket = socketIOClient(ENDPOINT);
		console.log(socket);

		socket.on("connect", () => {
			console.log("connected");
			socket.emit("hello", "hello");
		});

		socket.on("welcome", function (message) {
			console.log(message);
		});
	}

	render() {
		const messages = [];
		// [
		// 	{ username: "rowan", text: "penis" },
		// 	{ username: "someone else", text: "yes" },
		// ].forEach((message, i) => {
		this.state.messages.forEach((message, i) => {
			messages.push(
				<li key={i}>
					<span style={{ float: "left", width: "10rem" }}>
						{message.username}
					</span>
					{message.text}
					{/* {message.username + ": " + message.text} */}
				</li>
			);
		});

		return (
			<div
				style={{
					fontFamily:
						"-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
				}}
			>
				<form id="username-form" action="">
					<label htmlFor="username">Username</label>
					<input id="username" />
					<button>Confirm</button>
				</form>
				<div style={{ textAlign: "center" }}>
					<h2>Chat</h2>
				</div>
				<ul id="messages">{messages}</ul>
				<form id="message-form" action="">
					<input id="input" />
					<button>Send</button>
				</form>
			</div>
		);
	}
}

export default Chat;
