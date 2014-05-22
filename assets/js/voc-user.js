var gl;
var jLeaf = {
    tag: {
        LOG     : "[220] : ",
        ERROR   : "[240] : ",
        WARNING : "[250] : ",
    },

    shader: {
        programs             : [],
    },

    matrixStack                  : [],
    mvMatrix                     : mat4.create(),
    mMatrix                      : mat4.create(),
    vMatrix                      : mat4.create(),
    pMatrix                      : mat4.create(),
    cubeVertexPositionBuffer     : null,
    cubeVertexColorBuffer        : null,
    cubeVertexTextureCoordBuffer : null,
    cubeVertexNormalBuffer       : null,
    cubeVertexIndexBuffer        : null,
    myTexture                    : [],
    myRotX                       : 0,
    myRotY                       : 0,
    myAngle                      : 0,
    myLapseTime                  : new Date().getTime()
};

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                callback(currTime + timeToCall); 
            }, timeToCall);
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

var currentlyPressedKeys = {};

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;

    if (String.fromCharCode(event.keyCode) == "F") {
        //! TODO: do something...
    }
}

function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}

function handleKeys() {
    if (currentlyPressedKeys[33]) {
        //! TODO: page up
    }

    if (currentlyPressedKeys[34]) {
        //! TODO: page down
    }
}

function animLoop() {
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    requestAnimationFrame(animLoop);
    jLeaf.drawScene();
    jLeaf.animate();
}

jLeaf.shaderGenerateDefines = function(defines) {
    var value, chunk, chunks = [];

    for (var d in defines) {
        value = defines[d];
        if (value === false)
            continue;

        chunk = "#define " + value;
        chunks.push(chunk);
    }

    return chunks.join("\n");
};

jLeaf.shaderChunk = {
    color_head_fragment: [
        "#ifdef USE_COLOR",
        "    varying vec4 vColor;",
        "#endif"
    ].join("\n"),
    color_fragment: [
        "#ifdef USE_COLOR",
        "    gl_FragColor = gl_FragColor * vColor;",
        "#endif"
    ].join("\n"),
    color_head_vertex: [
        "#ifdef USE_COLOR",
        "    varying vec4 vColor;",
        "#endif"
    ].join("\n"),
    color_vertex: [
        "#ifdef USE_COLOR",
        "    vColor = aVertexColor;",
        "#endif"
    ].join("\n"),
    default_vertex: [
        "vec4 _MVPosition;",
        "_MVPosition = uMVMatrix * vec4(aVertexPosition, 1.0);",
        "gl_Position = uPMatrix * _MVPosition;"
    ].join("\n"),
    texture_head_fragment: [
        "#ifdef USE_TEXTURE",
        "    varying vec2 vTextureCoord;",
        "#endif"
    ].join("\n"),
    texture_fragment: [
        "#ifdef USE_TEXTURE",
        "    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));",
        "#endif"
    ].join("\n"),
    texture_head_vertex: [
        "#ifdef USE_TEXTURE",
        "    varying vec2 vTextureCoord;",
        "#endif"
    ].join("\n"),
    texture_vertex: [
        "#ifdef USE_TEXTURE",
        "    vTextureCoord = aVertexTextureCoord;",
        "#endif"
    ].join("\n"),
};

jLeaf.shaderCreator = {
    'basic': {
        vertexShader: [
            jLeaf.shaderChunk["color_head_vertex"],
            "void main() {",
                jLeaf.shaderChunk["color_vertex"],
                jLeaf.shaderChunk["default_vertex"],
            "}"
        ].join("\n"),
        fragmentShader: [
            "uniform vec3 uDiffuse;",
            "uniform float uOpacity;",
            jLeaf.shaderChunk["color_head_fragment"],
            "void main() {",
            "   gl_FragColor = vec4(uDiffuse, uOpacity);",
                jLeaf.shaderChunk["color_fragment"],
            "}"
        ].join("\n")
    },
    'full-basic': {
        vertexShader: [
            jLeaf.shaderChunk["texture_head_vertex"],
            jLeaf.shaderChunk["color_head_vertex"],
            "uniform mat3 uNMatrix;",
            "uniform vec3 uAmbientColor;",
            "uniform vec3 uLightingDirection;",
            "uniform vec3 uDirectionalColor;",
            "attribute vec3 aVertexNormal;",
            "varying vec3 vLightWeighting;",
            "void main(void) {",
                jLeaf.shaderChunk["default_vertex"],
                jLeaf.shaderChunk["texture_vertex"],
                jLeaf.shaderChunk["color_vertex"],

                "vec3 transformedNormal = uNMatrix * aVertexNormal;",
                "float directionalLightWeighting = max(dot(transformedNormal, uLightingDirection), 0.0);",
                "vLightWeighting = uAmbientColor + uDirectionalColor * directionalLightWeighting;",
            "}"
        ].join("\n"),
        fragmentShader: [
            jLeaf.shaderChunk["texture_head_fragment"],
            jLeaf.shaderChunk["color_head_fragment"],
            "varying vec3 vLightWeighting;",
            "void main(void) {",
                jLeaf.shaderChunk["texture_fragment"],
                jLeaf.shaderChunk["color_fragment"],
            "   gl_FragColor = vec4(gl_FragColor.rgb * vLightWeighting, gl_FragColor.a);",
            "}",
        ].join("\n"),
    },
};

jLeaf.init = function(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl") || canvas.getContext("webgl");

        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
        jLeaf.log(jLeaf.tag.ERROR, "Description: " + e.message);
    }

    if (gl === null) {
        jLeaf.log(jLeaf.tag.ERROR, "Unable to initialize WebGL.");
    }
};

jLeaf.getShader = function(id) {
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
        jLeaf.log(jLeaf.tag.ERROR, "Unknown script type.")
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        jLeaf.log(jLeaf.tag.ERROR, gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

jLeaf.getShaderFromCreator = function(name, type, prefix) {
    var str = "";

    var shader;
    var stype;
    if (type == "f") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        stype = "fragmentShader";
    } else if (type == "v") {
        shader = gl.createShader(gl.VERTEX_SHADER);
        stype = "vertexShader";
    } else {
        jLeaf.log(jLeaf.tag.ERROR, "Unknown script type.")
        return null;
    }

    str = prefix + jLeaf.shaderCreator[name][stype];

    console.log(str);

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        jLeaf.log(jLeaf.tag.ERROR, gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

jLeaf.cacheUniformLocations = function(program, identifiers) {
    var uniforms = {};

    for (var i = 0, l = identifiers.length; i < l; i++){
        var id = identifiers[i];
        uniforms[id] = gl.getUniformLocation(program, id);
    }

    return uniforms;
};

jLeaf.cacheAttributeLocations = function(program, identifiers) {
    var attributes = {};

    for (var i = 0, l = identifiers.length; i < l; i++){
        var id = identifiers[i];
        attributes[id] = gl.getAttribLocation(program, id);
    }

    return attributes;
};

jLeaf.setMatrixUniforms = function() {
    gl.uniformMatrix4fv(jLeaf.shader.programs[0].uniforms["uPMatrix"], false, jLeaf.pMatrix);
    gl.uniformMatrix4fv(jLeaf.shader.programs[0].uniforms["uMVMatrix"], false, jLeaf.mvMatrix);

    //! create normal matrix
    var normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, jLeaf.mvMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix3fv(jLeaf.shader.programs[0].uniforms["uNMatrix"], false, normalMatrix);
};

jLeaf.push = function() {
    var copy = mat4.create();
    mat4.copy(jLeaf.mvMatrix, copy);
    jLeaf.matrixStack.push(copy);
};

jLeaf.pop = function() {
    if (jLeaf.matrixStack.length == 0) {
        throw "Invalid popMat!";
    }

    jLeaf.mvMatrix = jLeaf.matrixStack.pop();
};

jLeaf.log = function(tag, message) {
    if (tag == jLeaf.tag.ERROR) {
        console.log(tag + message);
    }
};

jLeaf.createShaderProgram = function(defines) {
    var customDefines = jLeaf.shaderGenerateDefines(defines);

    var prefix_vertex = [
        "precision mediump float;",
        customDefines,
        "uniform mat4 uMVMatrix;",
        "uniform mat4 uPMatrix;",
        "attribute vec3 aVertexPosition;",
        "#ifdef USE_COLOR",
        "   attribute vec4 aVertexColor;",
        "#endif",
        "#ifdef USE_TEXTURE",
        "   attribute vec2 aVertexTextureCoord;",
        "#endif",
        "",
    ].join("\n");

    var prefix_fragment = [
        "precision mediump float;",
        customDefines,
        "#ifdef USE_TEXTURE",
        "   uniform sampler2D uSampler;",
        "#endif",
        "",
    ].join("\n");

    var fragmentShader = jLeaf.getShaderFromCreator("full-basic", "f", prefix_fragment);
    var vertexShader = jLeaf.getShaderFromCreator("full-basic", "v", prefix_vertex);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
        jLeaf.log(jLeaf.tag.ERROR, "Could not initialize shaders.");
        jLeaf.log(jLeaf.tag.ERROR, gl.getProgramInfoLog(program));
    }

    var identifiers = [
        "aVertexPosition",
        "aVertexColor",
        "aVertexTextureCoord",
        "aVertexNormal",
    ];

    program.attributes = jLeaf.cacheAttributeLocations(program, identifiers);

    identifiers = [
        "uPMatrix",
        "uMVMatrix",
        "uSampler",
        "uAmbientColor",
        "uLightingDirection",
        "uDirectionalColor",
    ];

    program.uniforms = jLeaf.cacheUniformLocations(program, identifiers);
    return program;
};

jLeaf.initShaders = function() {
    var defines = ["USE_TEXTURE", "USE_COLOR"];
    jLeaf.shader.programs[0] = jLeaf.createShaderProgram(defines);
};

jLeaf.initBuffers = function() {
    var scale = 1.0 * 0.5;
    var vertices = [
        -scale, -scale, -scale,
         scale, -scale, -scale,
         scale,  scale, -scale,
        -scale,  scale, -scale,
         scale, -scale,  scale,
         scale,  scale,  scale,
        -scale,  scale,  scale,
        -scale, -scale,  scale,
        -scale,  scale,  scale,
        -scale,  scale, -scale,
         scale, -scale,  scale,
         scale, -scale, -scale
    ];

    jLeaf.cubeVertexPositionBuffer = gl.createBuffer();
    jLeaf.cubeVertexPositionBuffer.itemSize = 3;
    jLeaf.cubeVertexPositionBuffer.numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var colors = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        0.0, 1.0, 0.0, 1.0
    ];

    jLeaf.cubeVertexColorBuffer = gl.createBuffer();
    jLeaf.cubeVertexColorBuffer.itemSize = 4;
    jLeaf.cubeVertexColorBuffer.numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var normals = [
        -1, -1, -1,
         1, -1, -1,
         1,  1, -1,
        -1,  1, -1,
         1, -1,  1,
         1,  1,  1,
        -1,  1,  1,
        -1, -1,  1,
        -1,  1,  1,
        -1,  1, -1,
         1, -1,  1,
         1, -1, -1,
    ];

    jLeaf.cubeVertexNormalBuffer = gl.createBuffer();
    jLeaf.cubeVertexNormalBuffer.itemSize = 2;
    jLeaf.cubeVertexNormalBuffer.numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var uvs = [
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0
    ];

    jLeaf.cubeVertexTextureCoordBuffer = gl.createBuffer();
    jLeaf.cubeVertexTextureCoordBuffer.itemSize = 2;
    jLeaf.cubeVertexTextureCoordBuffer.numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    var indices = [
        0, 2, 1,
        0, 3, 2,
        1, 5, 4,
        1, 2, 5,
        4, 6, 7,
        4, 5, 6,
        7, 3, 0,
        7, 6, 3,
        9, 5, 2,
        9, 8, 5,
        0, 11, 10,
        0, 10, 7
    ];

    jLeaf.cubeVertexIndexBuffer = gl.createBuffer();
    jLeaf.cubeVertexIndexBuffer.itemSize = 3;
    jLeaf.cubeVertexIndexBuffer.numItems = 36;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, jLeaf.cubeVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

jLeaf.loadImage = function(id, url) {
    var image = new Image();
    image.src = url;
    image.onload = function() {
        (function(texture){
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.bindTexture(gl.TEXTURE_2D, null);
        }(id));
    };

    return image;
};

jLeaf.initTextures = function() {
    jLeaf.myTexture[0] = gl.createTexture();
    jLeaf.myTexture[0].image = jLeaf.loadImage(jLeaf.myTexture[0], "assets/images/qrcode.png");
};

jLeaf.drawScene = function() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45.0, gl.viewportWidth / gl.viewportHeight, 0.001, 1000.0, jLeaf.pMatrix);
    mat4.lookAt(jLeaf.vMatrix,
                [ 0.0,  0.0,  3.0],
                [ 0.0,  0.0, -5.0],
                [ 0.0,  1.0,  0.0]);

    mat4.identity(jLeaf.mMatrix);
    mat4.multiply(jLeaf.mvMatrix, jLeaf.vMatrix, jLeaf.mMatrix);

    gl.useProgram(jLeaf.shader.programs[0]);

    jLeaf.push();
    mat4.scale(jLeaf.mvMatrix, jLeaf.mvMatrix, [1.0, 1.0, 1.0]);
    mat4.translate(jLeaf.mvMatrix, jLeaf.mvMatrix, [0.0, 0.0, 0.0]);
    mat4.rotate(jLeaf.mvMatrix, jLeaf.mvMatrix, jLeaf.degToRad(jLeaf.myRotY), [0.0, 1.0, 0.0]);
    mat4.rotate(jLeaf.mvMatrix, jLeaf.mvMatrix, jLeaf.degToRad(jLeaf.myRotX), [1.0, 0.0, 0.0]);
    jLeaf.setMatrixUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexPositionBuffer);
    gl.vertexAttribPointer(jLeaf.shader.programs[0].attributes["aVertexPosition"], jLeaf.cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexColorBuffer);
    gl.vertexAttribPointer(jLeaf.shader.programs[0].attributes["aVertexColor"], jLeaf.cubeVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(jLeaf.shader.programs[0].attributes["aVertexTextureCoord"], jLeaf.cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindBuffer(gl.ARRAY_BUFFER, jLeaf.cubeVertexNormalBuffer);
    gl.vertexAttribPointer(jLeaf.shader.programs[0].attributes["aVertexNormal"], jLeaf.cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, jLeaf.myTexture[0]);
    gl.uniform1i(jLeaf.shader.programs[0].uniforms["uSampler"], 0);
    gl.uniform3f(jLeaf.shader.programs[0].uniforms["uAmbientColor"], 3.0, 3.0, 3.0);

    var adjustedLightDirection = vec3.create();
    vec3.normalize([3.0, 3.0, 3.0], adjustedLightDirection);
    vec3.scale(adjustedLightDirection, -1);

    gl.uniform3fv(jLeaf.shader.programs[0].uniforms["uLightingDirection"], adjustedLightDirection);
    gl.uniform3f(jLeaf.shader.programs[0].uniforms["uDirectionalColor"], 3.0, 3.0, 3.0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, jLeaf.cubeVertexIndexBuffer);
    gl.enableVertexAttribArray(jLeaf.shader.programs[0].attributes["aVertexPosition"]);
    gl.enableVertexAttribArray(jLeaf.shader.programs[0].attributes["aVertexColor"]);
    gl.enableVertexAttribArray(jLeaf.shader.programs[0].attributes["aVertexTextureCoord"]);
    gl.enableVertexAttribArray(jLeaf.shader.programs[0].attributes["aVertexNormal"]);
    gl.drawElements(gl.TRIANGLES, jLeaf.cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    jLeaf.pop();

    gl.useProgram(null);
};

jLeaf.degToRad = function(a) {
    return a * Math.PI / 180;
}

jLeaf.animate = function() {
    var current = new Date().getTime();
    if (current != jLeaf.myLapseTime) {
        jLeaf.myRotY += (90 * (current - jLeaf.myLapseTime)) / 1000.0;
        jLeaf.myRotX += (90 * (current - jLeaf.myLapseTime)) / 1000.0;
        jLeaf.myLapseTime = current;
    }
};

jLeaf.main = function() {
    var canvas = document.getElementById("my-canvas");
    jLeaf.init(canvas);
    jLeaf.initShaders();
    jLeaf.initBuffers();
    jLeaf.initTextures();

    if (gl) {
        gl.clearColor(0.0, 0.7, 0.7, 1.0);
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        animLoop();
    }
};

(jLeaf.main());
