import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Game from "./components/Game";
import Chat from "./components/Chat";

function App() {
	return (
		<Router>
			<Switch>
				<Route exact path="/" component={Game} />
				<Route exact path="/chat" component={Chat} />
			</Switch>
		</Router>
	);
}

export default App;
