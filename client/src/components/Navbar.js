import React, { Component } from "react";

import { Navbar } from "react-bootstrap";

class MyNav extends Component {
	render() {
		return (
			<Navbar bg="dark" variant="dark" id="contentContainer">
				<Navbar.Brand href="/">RoPaSci360 Online</Navbar.Brand>
			</Navbar>
		);
	}
}

export default MyNav;
