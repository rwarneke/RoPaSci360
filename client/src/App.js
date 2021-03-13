import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import RoPaSci from "./components/RoPaSci";
import Home from "./components/Home";
import Navbar from "./components/Navbar";

const lobbyIDRegex = "([0-9]{6})";

const pathLobbyID = `/lobby/:lobbyID${lobbyIDRegex}`;

function App() {
	return (
		<Router>
			<Navbar />
			<Switch>
				<Route exact path="/" component={Home} />
				<Route exact path={pathLobbyID} component={RoPaSci} />
			</Switch>
		</Router>
	);
}

export default App;
