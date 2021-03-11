import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import TicTacToe from "./components/TicTacToe";
import RoPaSci from "./components/RoPaSci";
import Chat from "./components/Chat";

function App() {
	return (
		<Router>
			<Switch>
				<Route exact path="/" component={RoPaSci} />
				<Route exact path="/tictactoe" component={TicTacToe} />
				<Route exact path="/chat" component={Chat} />
			</Switch>
		</Router>
	);
}

export default App;
