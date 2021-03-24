import { Component } from "react";
import { Container } from "react-bootstrap";

class Feedback extends Component {
	render() {
		return (
			<Container
				style={{
					paddingTop: "2rem",
					textAlign: "center",
				}}
			>
				<p>
					Please send any questions or feedback to{" "}
					<a href="mailto: ropasci360online@gmail.com">
						ropasci360online@gmail.com
					</a>
					.
				</p>
			</Container>
		);
	}
}

export default Feedback;
