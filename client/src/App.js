import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import TicTacToe from "./components/TicTacToe";
import RoPaSci from "./components/RoPaSci";

function App() {
	return (
		<Router>
			<Switch>
				<Route exact path="/" component={RoPaSci} />
				<Route exact path="/tictactoe" component={TicTacToe} />
			</Switch>
		</Router>
	);
}

export default App;
