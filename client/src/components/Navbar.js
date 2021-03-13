import React, { Component } from "react";

import { Navbar, Container } from "react-bootstrap";

class MyNav extends Component {
	render() {
		return (
			<Navbar bg="dark" variant="dark">
				<Container>
					<Navbar.Brand href="/">RoPaSci360 Online</Navbar.Brand>
				</Container>
			</Navbar>
		);
	}
}

export default MyNav;
