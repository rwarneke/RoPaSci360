function f(x) {
	x.forEach((e) => {
		if (e > 0) return;
	});
	console.log("Made it to the end!");
}
