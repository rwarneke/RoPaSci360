const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

app.get("*", (req, res) => {
	// res.sendFile(path.)
});

const port = process.env.PORT || 5000;
http.listen(port, () => {
	console.log(`server is running on port ${port}`);
});
