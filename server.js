const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
	console.log(`server is running on port ${port}`);
});
