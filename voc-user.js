var gl;

function main() {
	var canvas = document.getElementById("my-canvas");
	gl = esInit(canvas);

	if (gl) {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
}

function esInit(canvas) {
	gl = null;

	try {
		gl = canvas.getContext("experimental-webgl");
	} catch (e) { }

	if (!gl) {
		alert("Unable to initialize WebGL.");
		gl = null;
	}
}


