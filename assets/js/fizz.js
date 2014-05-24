var gl;
var jFizz = {
    tag: {
        LOG     : '[220] : ',
        ERROR   : '[240] : ',
        WARNING : '[250] : ',
    },

    shader: {
        programs             : [],
    },

    identifiers: {
        attribute: [
            'aVertexPosition',
            'aVertexColor',
            'aVertexTextureCoord',
            'aVertexNormal',
        ],

        uniform: [
            'uPMatrix',
            'uMVMatrix',
            'uNMatrix',
            'uDiffuseColor',
            'uOpacity',
            'uSampler',
            'uAmbientColor',
            'uLightingLocation',
            'uLightingColor',
        ],
    },

    matrixStack                  : [],
    mvMatrix                     : mat4.create(),
    mMatrix                      : mat4.create(),
    vMatrix                      : mat4.create(),
    pMatrix                      : mat4.create(),

    myTexture                    : [],
    myRotX                       : 0,
    myRotY                       : 0,
    myAngle                      : 0,
    myLapseTime                  : new Date().getTime(),
    myObjects                    : []
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

    if (String.fromCharCode(event.keyCode) == 'F') {
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

    jFizz.drawScene();
    jFizz.animate();
}

jFizz.shaderGenerateDefines = function(defines) {
    var chunk, chunks = [];

    defines.each(function(item, index) {
        chunk = '#define ' + item;
        chunks.push(chunk);
    });

    return chunks.join('\n');
};

jFizz.shaderChunk = {
    color_head_fragment: [
        '#ifdef USE_COLOR',
        '    varying vec4 vColor;',
        '#endif'
    ].join('\n'),
    color_fragment: [
        '#ifdef USE_COLOR',
        '    gl_FragColor = gl_FragColor * vColor;',
        '#endif'
    ].join('\n'),
    color_head_vertex: [
        '#ifdef USE_COLOR',
        '    varying vec4 vColor;',
        '#endif'
    ].join('\n'),
    color_vertex: [
        '#ifdef USE_COLOR',
        '    vColor = aVertexColor;',
        '#endif'
    ].join('\n'),
    default_vertex: [
        '    vec4 _MVPosition;',
        '    _MVPosition = uMVMatrix * vec4(aVertexPosition, 1.0);',
        '    gl_Position = uPMatrix * _MVPosition;'
    ].join('\n'),
    default_fragment: [
        '    gl_FragColor = vec4(uDiffuseColor, uOpacity);',
    ].join('\n'),
    light_head_fragment: [
        '#ifdef USE_LIGHTING',
        '    varying vec3 vLightWeighting;',
        '#endif'
    ].join('\n'),
    light_fragment: [
        '#ifdef USE_LIGHTING',
        '   gl_FragColor = vec4(gl_FragColor.rgb * vLightWeighting, gl_FragColor.a);',
        '#endif'
    ].join('\n'),
    light_head_vertex: [
        '#ifdef USE_LIGHTING',
        '    varying vec3 vLightWeighting;',
        '#endif'
    ].join('\n'),
    light_vertex: [
        '#ifdef USE_LIGHTING',
        '    vec3 _TransformedNormal = uNMatrix * aVertexNormal;',
        '    #if defined(USE_DL)',
        '        float _LightWeighting = max(dot(_TransformedNormal, uLightingLocation), 0.0);',
        '        vLightWeighting = uAmbientColor + uLightingColor * _LightWeighting;',
        '    #elif defined(USE_PL)',
        '        vec3 _LightDirection = normalize(uLightingLocation - _MVPosition.xyz);',
        '        float _LightWeighting = max(dot(_TransformedNormal, _LightDirection), 0.0);',
        '        vLightWeighting = uAmbientColor + uLightingColor * _LightWeighting;',
        '    #endif',
        '#endif'
    ].join('\n'),
    texture_head_fragment: [
        '#ifdef USE_TEXTURE',
        '    varying vec2 vTextureCoord;',
        '#endif'
    ].join('\n'),
    texture_fragment: [
        '#ifdef USE_TEXTURE',
        '    gl_FragColor = gl_FragColor * texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));',
        '#endif'
    ].join('\n'),
    texture_head_vertex: [
        '#ifdef USE_TEXTURE',
        '    varying vec2 vTextureCoord;',
        '#endif'
    ].join('\n'),
    texture_vertex: [
        '#ifdef USE_TEXTURE',
        '    vTextureCoord = aVertexTextureCoord;',
        '#endif'
    ].join('\n'),
};

jFizz.shaderCreator = {
    'basic': {
        vertexShader: [
            jFizz.shaderChunk['color_head_vertex'],
            'void main() {',
                jFizz.shaderChunk['color_vertex'],
                jFizz.shaderChunk['default_vertex'],
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 uDiffuse;',
            'uniform float uOpacity;',
            jFizz.shaderChunk['color_head_fragment'],
            'void main() {',
            '   gl_FragColor = vec4(uDiffuse, uOpacity);',
                jFizz.shaderChunk['color_fragment'],
            '}'
        ].join('\n')
    },
    'full-basic': {
        vertexShader: [
            jFizz.shaderChunk['texture_head_vertex'],
            jFizz.shaderChunk['color_head_vertex'],
            jFizz.shaderChunk['light_head_vertex'],
            'void main(void) {',
                jFizz.shaderChunk['default_vertex'],
                jFizz.shaderChunk['texture_vertex'],
                jFizz.shaderChunk['color_vertex'],
                jFizz.shaderChunk['light_vertex'],
            '}'
        ].join('\n'),
        fragmentShader: [
            jFizz.shaderChunk['texture_head_fragment'],
            jFizz.shaderChunk['color_head_fragment'],
            jFizz.shaderChunk['light_head_fragment'],
            'void main(void) {',
                jFizz.shaderChunk['default_fragment'],
                jFizz.shaderChunk['texture_fragment'],
                jFizz.shaderChunk['color_fragment'],
                jFizz.shaderChunk['light_fragment'],
            '}',
        ].join('\n'),
    },
};

jFizz.createContext = function(canvas) {
    var names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var context = null;
    for (var i = 0, l = names.length; i < l; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch (e) { }

        if (context) break;
    }

    return context;
};

jFizz.init = function(canvas) {
    try {
        gl = jFizz.createContext(canvas);

        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
        jFizz.log(jFizz.tag.ERROR, 'Description: ' + e.message);
    }

    if (gl === null) {
        jFizz.log(jFizz.tag.ERROR, 'Unable to initialize WebGL.');
    }
};

jFizz.getShader = function(id) {
    var shaderSource = document.getElementById(id);
    if (!shaderSource) {
        return null;
    }

    var str = '';
    var k = shaderSource.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }

        k = k.nextSibling;
    }

    var shader;
    if (shaderSource.type == 'x-shader/x-fragment') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderSource.type == 'x-shader/x-vertex') {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        jFizz.log(jFizz.tag.ERROR, 'Unknown script type.')
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        jFizz.log(jFizz.tag.ERROR, gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

jFizz.getShaderFromCreator = function(name, type, prefix) {
    var str = '';

    var shader;
    var stype;
    if (type == 'f') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        stype = 'fragmentShader';
    } else if (type == 'v') {
        shader = gl.createShader(gl.VERTEX_SHADER);
        stype = 'vertexShader';
    } else {
        jFizz.log(jFizz.tag.ERROR, 'Unknown script type.')
        return null;
    }

    str = prefix + jFizz.shaderCreator[name][stype];

    console.log(str);

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) === false) {
        jFizz.log(jFizz.tag.ERROR, gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

jFizz.cacheUniformLocations = function(program, identifiers) {
    var uniforms = {};

    for (var i = 0, l = identifiers.length; i < l; i++){
        var id = identifiers[i];
        uniforms[id] = gl.getUniformLocation(program, id);
    }

    return uniforms;
};

jFizz.cacheAttributeLocations = function(program, identifiers) {
    var attributes = {};

    for (var i = 0, l = identifiers.length; i < l; i++){
        var id = identifiers[i];
        attributes[id] = gl.getAttribLocation(program, id);
    }

    return attributes;
};

jFizz.setMatrixUniforms = function() {
    var program = jFizz.shader.programs[0];

    gl.uniformMatrix4fv(program.uniforms['uPMatrix'], false, jFizz.pMatrix);
    gl.uniformMatrix4fv(program.uniforms['uMVMatrix'], false, jFizz.mvMatrix);

    //! create normal matrix
    var normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, jFizz.mvMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix3fv(program.uniforms['uNMatrix'], false, normalMatrix);
};

jFizz.push = function() {
    var copy = mat4.create();
    mat4.copy(copy, jFizz.mvMatrix);
    jFizz.matrixStack.push(copy);
};

jFizz.pop = function() {
    if (jFizz.matrixStack.length == 0) {
        throw 'Invalid pop call!';
    }

    jFizz.mvMatrix = jFizz.matrixStack.pop();
};

jFizz.log = function(tag, message) {
    if (tag == jFizz.tag.ERROR) {
        console.log(tag + message);
    } else {
        console.log(tag + message);
    }
};

jFizz.createShaderProgram = function(defines) {
    var customDefines = jFizz.shaderGenerateDefines(defines);

    var prefix_vertex = [
        'precision mediump float;', '',
        customDefines, '',
        'uniform mat4 uMVMatrix;',
        'uniform mat4 uPMatrix;',
        'uniform mat3 uNMatrix;',
        '#ifdef USE_LIGHTING',
        '    uniform vec3 uAmbientColor;',
        '    uniform vec3 uLightingLocation;',
        '    uniform vec3 uLightingColor;',
        '#endif',
        '',
        'attribute vec3 aVertexPosition;',
        'attribute vec3 aVertexNormal;',
        '#ifdef USE_COLOR',
        '   attribute vec4 aVertexColor;',
        '#endif',
        '#ifdef USE_TEXTURE',
        '   attribute vec2 aVertexTextureCoord;',
        '#endif',
        '',
    ].join('\n');

    var prefix_fragment = [
        'precision mediump float;', '',
        customDefines, '',
        'uniform vec3 uDiffuseColor;',
        'uniform float uOpacity;',
        '#ifdef USE_TEXTURE',
        '   uniform sampler2D uSampler;',
        '#endif',
        '',
    ].join('\n');

    var fragmentShader = jFizz.getShaderFromCreator('full-basic', 'f', prefix_fragment);
    var vertexShader = jFizz.getShaderFromCreator('full-basic', 'v', prefix_vertex);

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
        jFizz.log(jFizz.tag.ERROR, 'Could not initialize shaders.');
        jFizz.log(jFizz.tag.ERROR, gl.getProgramInfoLog(program));
    }

    program.attributes = jFizz.cacheAttributeLocations(program, jFizz.identifiers['attribute']);
    program.uniforms = jFizz.cacheUniformLocations(program, jFizz.identifiers['uniform']);

    return program;
};

jFizz.initShaders = function() {
    var defines = ['USE_LIGHTING', 'USE_COLOR', 'USE_TEXTURE', 'USE_PL'];
    jFizz.shader.programs[0] = jFizz.createShaderProgram(defines);
};

jFizz.initBuffers = function() {
    //jFizz.initCubeBuffers();
};

jFizz.initCubeBuffers = function() {
    var geometry = new jFizz.ObjectMesh();
    jFizz.myObjects.push(geometry);

    var object = jFizz.myObjects[0];
    object.buffers = {};

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

    object.buffers['vertices'] = gl.createBuffer();
    object.buffers['vertices'].itemSize = 3;
    object.buffers['vertices'].numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers['vertices']);
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

    object.buffers['colors'] = gl.createBuffer();
    object.buffers['colors'].itemSize = 4;
    object.buffers['colors'].numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers['colors']);
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

    object.buffers['normals'] = gl.createBuffer();
    object.buffers['normals'].itemSize = 3;
    object.buffers['normals'].numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers['normals']);
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

    object.buffers['uvs'] = gl.createBuffer();
    object.buffers['uvs'].itemSize = 2;
    object.buffers['uvs'].numItems = 12;

    gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers['uvs']);
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

    object.buffers['indices'] = gl.createBuffer();
    object.buffers['indices'].itemSize = 3;
    object.buffers['indices'].numItems = 36;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.buffers['indices']);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

jFizz.loadImage = function(id, url) {
    var image = new Image();
    image.src = url;
    image.onload = function() {
        (function(texture){
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                gl.generateMipmap(gl.TEXTURE_2D);
                gl.bindTexture(gl.TEXTURE_2D, null);
        }(id));
    };

    return image;
};

jFizz.initTextures = function() {
    jFizz.myTexture[0] = gl.createTexture();
    jFizz.myTexture[0].image = jFizz.loadImage(jFizz.myTexture[0], 'assets/images/qrcode.png');
};

jFizz.translate = function(mat, vec) {
    var x = vec[0], y = vec[1], z = vec[2];

    mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
    mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
    mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
    mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
};

var initialized = false;

jFizz.drawScene = function() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var ratio = gl.viewportWidth / gl.viewportHeight;
    mat4.perspective(jFizz.pMatrix, 45.0, ratio, 0.1, 100.0);
    mat4.lookAt(jFizz.vMatrix,
                [ 0.0,  0.0,  3.0],  //! eye position
                [ 0.0,  0.0, -5.0],  //! point target
                [ 0.0,  1.0,  0.0]); //! vector pointing up

    mat4.identity(jFizz.mMatrix);
    mat4.multiply(jFizz.mvMatrix, jFizz.vMatrix, jFizz.mMatrix);

    if (jFizz.myObjects[0] === undefined) return;

    if (jFizz.myObjects[0].initialized == false) {
        var object = jFizz.myObjects[0];

        var identifiers = ['vertices', 'colors', 'normals', 'uvs', 'indices'];

        var buffers = {};
        for (var i = 0, l = identifiers.length; i < l; i++) {
            var id = identifiers[i];
            var buffer = gl.createBuffer();

            buffer.itemSize = object.attributes[id].itemSize;
            buffer.numItems = object.attributes[id].numItems;

            if (id != 'indices') {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.attributes[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            } else {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.attributes[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }

            buffers[id] = buffer;
            buffers[id].name = id;
        }

        object.buffers = buffers;
        object.initialized = true;
    }

    jFizz.drawCube();
};

jFizz.drawCube = function() {
    var object = jFizz.myObjects[0];
    var program = jFizz.shader.programs[0];

    gl.useProgram(program);
    gl.uniform3fv(program.uniforms['uDiffuseColor'], [1.0, 1.0, 1.0]);
    gl.uniform1f(program.uniforms['uOpacity'], 0.7);

    gl.uniform3fv(program.uniforms['uAmbientColor'], [0.2, 0.2, 0.2]);
    gl.uniform3fv(program.uniforms['uLightingLocation'], [0.0, 0.0, -10.0]);
    gl.uniform3fv(program.uniforms['uLightingColor'], [0.8, 0.8, 0.8]);

    jFizz.push();

    jFizz.translate(jFizz.mvMatrix, [0.0, 0.0, -1.0]);
    mat4.rotate(jFizz.mvMatrix, jFizz.mvMatrix, jFizz.degToRad(jFizz.myRotY), [0.0, 1.0, 0.0]);
    mat4.rotate(jFizz.mvMatrix, jFizz.mvMatrix, jFizz.degToRad(jFizz.myRotX), [1.0, 0.0, 0.0]);
    jFizz.setMatrixUniforms();

    var identifiers = ['vertices', 'colors', 'uvs', 'normals'];
    for (var i = 0, l = jFizz.identifiers['attribute'].length; i < l; i++) {
        if (identifiers.length != l) {
            console.log('Uneven');
            break;
        }
        
        var aid = jFizz.identifiers['attribute'][i];
        var bid = identifiers[i];

        if (program.attributes[aid] != -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers[bid]);
            gl.vertexAttribPointer(program.attributes[aid], object.buffers[bid].itemSize, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }
    }

    if (program.attributes['aVertexTextureCoord'] != -1) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, jFizz.myTexture[0]);
        gl.uniform1i(program.uniforms['uSampler'], 0);
    }

    //! TODO: alpha enabled
    if (true) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.buffers['indices']);
    for (var i = 0, l = jFizz.identifiers['attribute'].length; i < l; i++) {
        var id = jFizz.identifiers['attribute'][i];
        if (program.attributes[id] != -1) {
            gl.enableVertexAttribArray(program.attributes[id]);
        }
    }
    gl.drawElements(object.faceType, object.buffers['indices'].numItems, gl.UNSIGNED_SHORT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    jFizz.pop();

    gl.useProgram(null);
};

jFizz.degToRad = function(a) {
    return a * Math.PI / 180;
};

jFizz.animate = function() {
    var current = new Date().getTime();
    if (current != jFizz.myLapseTime) {
        jFizz.myRotY += (-30 * (current - jFizz.myLapseTime)) / 1000.0;
        jFizz.myRotX += (30 * (current - jFizz.myLapseTime)) / 1000.0;
        jFizz.myLapseTime = current;
    }
};

jFizz.Math = {
    generateUUID: function() {
        var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        var uuid = new Array(36);
        var rnd = 0, r;

        return function() {
            for (var i = 0; i < 36; i++) {
                if (i == 8 || i == 13 || i ==18 || i == 23) {
                    uuid[i] = '-';
                } else if (i == 14) {
                    uuid[i] = '4';
                } else {
                    if (rnd <= 0x02) {
                        rnd = 0x2000000 + (Math.random() * 0x1000000) | 0;
                    }

                    r = rnd & 0xf;
                    rnd = rnd >> 24;
                    uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
                }
            }

            return uuid.join('');
        };
    }()
};

jFizz.ObjectMesh = function() {
    this.uuid = jFizz.Math.generateUUID();
    this.faceType = -1;
    this.attributes = {};
};

jFizz.ObjectMesh.prototype = {
    constructor: jFizz.ObjectMesh,
};

jFizz.loadJSONModel = function(url, callback) {

    var request = new Request.JSON({
        method: 'GET',
        url: url,
        onProgress: function(event, xhr) {
            var loaded = event.loaded, total = event.total;
            jFizz.log(jFizz.tag.LOG, 'Percent: ' + parseInt(loaded / total * 100, 10) + '%');
        },
        onError: function(text, error){
            jFizz.log(jFizz.tag.ERROR, error);
        },
        onSuccess: function(data) {

            if (data.metadata.type == 'geometry') {
                var result = parse(data);
                callback(result.geometry);
            }

            function parse(d) {
                var geometry = new jFizz.ObjectMesh();

                var vertices = d.attributes.vertices,
                    indices = d.attributes.indices,
                    colors = d.attributes.colors,
                    normals = d.attributes.normals
                    uvs = null;

                if (d.attributes.uvs !== undefined) {
                    uvs = d.attributes.uvs;
                }

                if (false) {
                    for (var i = 0, l = vertices.content.length; i < l;) {
                        var vertex = vec3.create();
                        vertex.x = vertices.content[i++];
                        vertex.y = vertices.content[i++];
                        vertex.z = vertices.content[i++];

                        geometry.vertices.push(vertex);
                    }

                    for (var i = 0, l = indices.content.length; i < l;) {
                        var indice = vec3.create();
                        indice.x = indices.content[i++];
                        indice.y = indices.content[i++];
                        indice.z = indices.content[i++];

                        geometry.indices.push(indice);
                    }

                    for (var i = 0, l = colors.content.length; i < l;) {
                        var color = vec4.create();
                        color.x = colors.content[i++];
                        color.y = colors.content[i++];
                        color.z = colors.content[i++];
                        color.w = colors.content[i++];

                        geometry.colors.push(color);
                    }

                    for (var i = 0, l = normals.content.length; i < l;) {
                        var normal = vec3.create();
                        normal.x = normals.content[i++];
                        normal.y = normals.content[i++];
                        normal.z = normals.content[i++];

                        geometry.normals.push(normals.content[i]);
                    }

                    if (uvs !== undefined) {
                        for (var i = 0, l = uvs.content.length; i < l;) {
                            var uv = vec2.create();
                            uv.x = uvs.content[i++];
                            uv.y = uvs.content[i++];

                            geometry.uvs.push(uv);
                        }
                    }
                }

                geometry.attributes['vertices'] = vertices.content;
                geometry.attributes['vertices'].itemSize = vertices.itemSize;
                geometry.attributes['vertices'].numItems = vertices.numItems;

                geometry.attributes['indices'] = indices.content;
                geometry.attributes['indices'].itemSize = indices.itemSize;
                geometry.attributes['indices'].numItems = indices.numItems;

                if (colors !== undefined) {
                    geometry.attributes['colors'] = colors.content;
                    geometry.attributes['colors'].itemSize = colors.itemSize;
                    geometry.attributes['colors'].numItems = colors.numItems;
                }

                if (normals !== undefined) {
                    geometry.attributes['normals'] = normals.content;
                    geometry.attributes['normals'].itemSize = normals.itemSize;
                    geometry.attributes['normals'].numItems = normals.numItems;
                }

                if (uvs !== undefined) {
                    geometry.attributes['uvs'] = uvs.content;
                    geometry.attributes['uvs'].itemSize = uvs.itemSize;
                    geometry.attributes['uvs'].numItems = uvs.numItems;
                }

                var faceType = -1;
                switch (d.attributes.faceType) {
                    case 'line':
                        break;
                    default:
                    case 'triangle':
                        faceType = gl.TRIANGLES;
                        break;
                }

                geometry.faceType = faceType;

                if (d.materials !== undefined) {
                    var materials = d.materials;
                    materials.textures = d.textures;
                    materials.images = d.images;

                    return { geometry: geometry, materials: materials };
                }

                return { geometry: geometry, materials: null };
            }
        }
    });

    request.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
    request.send();
};

jFizz.main = function() {
    var canvas = $('my-canvas');
    jFizz.init(canvas);
    jFizz.initShaders();
    jFizz.initBuffers();
    jFizz.initTextures();

    jFizz.loadJSONModel('assets/models/cube.json', function(geometry) {
        geometry.initialized = false;
        jFizz.myObjects.push(geometry);
    });

    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(2.0);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        animLoop();
    }
};

window.addEvent('domready', function() {
    jFizz.main();
});
