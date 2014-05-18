var gl                            = null;
var leaf                          = {};

leaf.tag                          = {};

leaf.tag.LOG                      = "[220]: ";
leaf.tag.ERROR                    = "[240]: ";
leaf.tag.WARNING                  = "[250]: ";

leaf.shaderProgram                = null;
leaf.mvMatrix                     = mat4.create();
leaf.pMatrix                      = mat4.create();
leaf.triangleVertexPositionBuffer = null;

leaf.init = function(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl") || canvas.getContext("webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) { }

    if (!gl) {
        this.log(this.tag.ERROR, "Unable to initialize WebGL.");
    }
}

leaf.getShader = function(gl, id) {
    var shaderSource = document.getElementById(id);
    if (!shaderSource) {
        return null;
    }

    var str = "";
    var k = shaderSource.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }

        k = k.nextSibling;
    }

    var shader;
    if (shaderSource.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderSource.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        this.log(this.tag.ERROR, "Unknown script type.")
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        this.log(this.tag.ERROR, gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

leaf.setMatrixUniforms = function() {
    gl.uniformMatrix4fv(this.shaderProgram.pMatrix_uniform, false, this.pMatrix);
    gl.uniformMatrix4fv(this.shaderProgram.mvMatrix_uniform, false, this.mvMatrix);
}

leaf.log = function(tag, message) {
    if (tag == this.tag.ERROR) {
        console.log(tag + message);
    }
}

leaf.initShaders = function() {
    var fragmentShader = leaf.getShader(gl, "shader-fs");
    var vertexShader = leaf.getShader(gl, "shader-vs");

    this.shaderProgram = gl.createProgram();
    gl.attachShader(this.shaderProgram, vertexShader);
    gl.attachShader(this.shaderProgram, fragmentShader);

    gl.linkProgram(this.shaderProgram);
    if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
        this.log(this.tag.ERROR, "Could not initialize shaders.");
        this.log(this.tag.ERROR, gl.getProgramInfoLog(this.shaderProgram));
    }

    this.shaderProgram.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexPosition");

    this.shaderProgram.pMatrix_uniform = gl.getUniformLocation(this.shaderProgram, "uPMatrix");
    this.shaderProgram.mvMatrix_uniform = gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
}

leaf.initBuffers = function() {
    var vertices = [
         0.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0
    ];

    this.triangleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);



    this.triangleVertexPositionBuffer.itemSize = 3;
    this.triangleVertexPositionBuffer.numItems = 3;
}

leaf.drawScene = function() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 750.0, this.pMatrix);
    mat4.identity(this.mvMatrix);

    gl.useProgram(this.shaderProgram);

    this.setMatrixUniforms();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
        gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
        gl.drawArrays(gl.TRIANGLES, 0, this.triangleVertexPositionBuffer.numItems);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.useProgram(null);
}

leaf.main = function() {
    var canvas = document.getElementById("my-canvas");
    this.init(canvas);
    this.initShaders();
    this.initBuffers();

    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        this.drawScene();
    }
}

