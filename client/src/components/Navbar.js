import React, { Component } from "react";

import { Nav, Navbar } from "react-bootstrap";

class MyNav extends Component {
	render() {
		return (
			<Navbar bg="dark" variant="dark" id="contentContainer">
				<Navbar.Brand href="/">RoPaSci360 Online</Navbar.Brand>
				<Nav className="ml-auto">
					<Nav.Link href="/feedback">Feedback</Nav.Link>
				</Nav>
			</Navbar>
		);
	}
}

export default MyNav;
