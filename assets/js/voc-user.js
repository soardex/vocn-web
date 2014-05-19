var gl                            = null;
var leaf                          = {};

leaf.tag                          = {};

leaf.tag.LOG                      = "[220]: ";
leaf.tag.ERROR                    = "[240]: ";
leaf.tag.WARNING                  = "[250]: ";

leaf.shaderProgram                = null;
leaf.matrixStack                  = [];
leaf.mvMatrix                     = mat4.create();
leaf.mMatrix                      = mat4.create();
leaf.vMatrix                      = mat4.create();
leaf.pMatrix                      = mat4.create();
leaf.triangleVertexPositionBuffer = null;
leaf.triangleVertexColorBuffer    = null;
leaf.myTexture                    = null;

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame']
                                || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

function animLoop() {
    requestAnimationFrame(animLoop);
    leaf.drawScene();
    leaf.animate();
}

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

leaf.pushMat = function() {
    var copy = mat4.create();
    mat4.copy(this.mvMatrix, copy);
    this.matrixStack.push(copy);
}

leaf.popMat = function() {
    if (this.matrixStack.length == 0) {
        throw "Invalid popMat!";
    }

    this.mvMatrix = this.matrixStack.pop();
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
    this.shaderProgram.vertexColorAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexColor");

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

    var colors = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];

    this.triangleVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.triangleVertexColorBuffer.itemSize = 3;
    this.triangleVertexColorBuffer.numItems = 3;
}

leaf.initTexture = function() {
    myTexture = gl.createTexture();
    myTexture.image = new Image();
    myTexture.image.onload = function() {
        (function(texture){
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                    gl.UNSIGNED_BYTE, texture.image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.bindTexture(gl.TEXTURE_2D, null);
        })(myTexture);
    }

    myTexture.image.src = "sample.gif";
}

leaf.drawScene = function() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45.0, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, this.pMatrix);
    mat4.lookAt(this.vMatrix,
                [ 0.0,  0.0,  3.0],
                [ 0.0,  0.0, -5.0],
                [ 0.0,  1.0,  0.0]);
    mat4.identity(this.mMatrix);
    mat4.multiply(this.mvMatrix, this.vMatrix, this.mMatrix);

    gl.useProgram(this.shaderProgram);

    this.pushMat();
    mat4.scale(this.mvMatrix, this.mvMatrix, [1.0, 1.0, 1.0]);
    mat4.translate(this.mvMatrix, this.mvMatrix, [0.0, 0.0, 0.0]);
    this.setMatrixUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexPositionBuffer);
    gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triangleVertexColorBuffer);
    gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, this.triangleVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
    gl.enableVertexAttribArray(this.shaderProgram.vertexColorAttribute);

    gl.drawArrays(gl.TRIANGLES, 0, this.triangleVertexPositionBuffer.numItems);
    this.popMat();

    gl.useProgram(null);
}

leaf.animate = function() {
}

leaf.main = function() {
    var canvas = document.getElementById("my-canvas");
    this.init(canvas);
    this.initShaders();
    this.initBuffers();

    if (gl) {
        gl.clearColor(0.0, 0.7, 0.7, 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        animLoop();
    }
}

