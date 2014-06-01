/**
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see <http://www.gnu.org/licenses/>.
 *
 * Copyright (C) Fitz Abucay, 2014. All Rights Reserved.
 *
 */

var gl;
var jFizz = {
    tag: {
        LOG: '[220] : ',
        ERROR: '[240] : ',
        WARNING : '[250] : ',
    },
    shader: {
        programs: [],
        matrices: {
            modelview: mat4.create(),
            model: mat4.create(),
            view: mat4.create(),
            projection: mat4.create()
        },
        constants: {
            perspective: mat4.create(),
            ortho: mat4.create()
        }
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
            'uResolution',
            'uDiffuseColor',
            'uOpacity',
            'uTime',
            'uSampler',
            'uAmbientColor',
            'uLightingLocation',
            'uLightingColor',
        ],
    },
    info: {
        memory: {
            programs: 0,
            geometries: 0,
            textures: 0
        },
        render: {
            calls: 0,
            vertices: 0,
            indices: 0,
            points: 0
        }
    },
    events: {
        keyboard: {},
        mouse: {
            position: {
                x: 0,
                y: 0
            },
            button: false
        },
    },
    matrixStack: [],
    activeCamera: {
        eye: vec3.fromValues(0.0, 0.0, 5.0),
        point: vec3.fromValues(0.0, 0.0, -1.0),
        up: vec3.fromValues(0.0, 1.0, 0.0),
        angle: 0,
        look: 0
    },
    frustum: {
        planes: [],
    },
    physics: {},
    sceneManager: null,
    sharedResources: {
        textures: [],
        materials: []
    },
    time: {
        lapseTime: new Date().getTime(),
    },

    myRotX: 0,
    myRotY: 0,
    myZoom: 0,
    myAssets: [
        'assets/models/cube.json',
        'assets/models/skybox.json',
    ],
};

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !self.requestAnimationFrame; ++x) {
        self.requestAnimationFrame = self[vendors[x] + 'RequestAnimationFrame'];
        self.cancelAnimationFrame = self[vendors[x] + 'CancelAnimationFrame'] ||
                self[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!self.requestAnimationFrame) {
        self.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = self.setTimeout(function() {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!self.cancelAnimationFrame) {
        self.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());


jFizz.Controls = {
    handleKeyDown: function(event) {
        jFizz.events.keyboard[event.keyCode] = true;
    },
    handleKeyUp: function(event) {
        jFizz.events.keyboard[event.keyCode] = false;
    },
    handleMouseDown: function(event) {
        jFizz.events.mouse.button = true;
        jFizz.events.mouse.position.x = event.clientX;
        jFizz.events.mouse.position.y = event.clientY;
    },
    handleMouseUp: function(event) {
        jFizz.events.mouse.button = false;
    },
    handleMouseMove: function(event) {
        jFizz.events.mouse.position.x = event.clientX;
        jFizz.events.mouse.position.y = event.clientY;
    }
};

jFizz.handleKeys = function(delta) {
    //! KEY_PAGE_UP
    if (jFizz.events.keyboard[33]) {
        jFizz.myZoom -= 0.1;
    }

    //! KEY_PAGE_DOWN
    if (jFizz.events.keyboard[34]) {
        jFizz.myZoom += 0.1;
    }

    var speed = 10;

    //! KEY_LEFT
    if (jFizz.events.keyboard[37]) {
        jFizz.activeCamera.angle -= speed * (delta / 1000.0);
        jFizz.activeCamera.point[0] = Math.sin(jFizz.activeCamera.angle);
        jFizz.activeCamera.point[2] = -Math.cos(jFizz.activeCamera.angle);
    }

    //! KEY_UP
    if (jFizz.events.keyboard[38]) {
        jFizz.activeCamera.eye[0] += jFizz.activeCamera.point[0] * speed * (delta / 1000.0);
        jFizz.activeCamera.eye[1] += jFizz.activeCamera.point[1] * speed * (delta / 1000.0);
        jFizz.activeCamera.eye[2] += jFizz.activeCamera.point[2] * speed * (delta / 1000.0);
    }

    //! KEY_RIGHT
    if (jFizz.events.keyboard[39]) {
        jFizz.activeCamera.angle += speed * (delta / 1000.0);
        jFizz.activeCamera.point[0] = Math.sin(jFizz.activeCamera.angle);
        jFizz.activeCamera.point[2] = -Math.cos(jFizz.activeCamera.angle);
    }

    //! KEY_DOWN
    if (jFizz.events.keyboard[40]) {
        jFizz.activeCamera.eye[0] -= jFizz.activeCamera.point[0] * speed * (delta / 1000.0);
        jFizz.activeCamera.eye[1] -= jFizz.activeCamera.point[1] * speed * (delta / 1000.0);
        jFizz.activeCamera.eye[2] -= jFizz.activeCamera.point[2] * speed * (delta / 1000.0);
    }

    //! KEY_END
    if (jFizz.events.keyboard[35]) {
        jFizz.activeCamera.look -= speed * (delta / 1000.0);
        jFizz.activeCamera.point[1] = Math.sin(jFizz.activeCamera.look);
    }

    //! KEY_HOME
    if (jFizz.events.keyboard[36]) {
        jFizz.activeCamera.look += speed * (delta / 1000.0);
        jFizz.activeCamera.point[1] = Math.sin(jFizz.activeCamera.look);
    }

    //! KEY_A
    if (jFizz.events.keyboard[65]) {
        jFizz.myZoom -= 0.1;
    }

    //! KEY_W
    if (jFizz.events.keyboard[87]) {
        jFizz.myZoom += 0.1;
    }

    //! KEY_D
    if (jFizz.events.keyboard[68]) {
        jFizz.myZoom -= 0.1;
    }

    //! KEY_S
    if (jFizz.events.keyboard[83]) {
        jFizz.myZoom += 0.1;
    }

    //! KEY_SPACE
    if (jFizz.events.keyboard[32]) {
        jFizz.myZoom += 0.1;
    }

    //! KEY_ESCAPE
    if (jFizz.events.keyboard[27]) {
        jFizz.myZoom += 0.1;
    }

    //! KEY_P
    if (jFizz.events.keyboard[80]) {
        jFizz.myZoom += 0.1;
    }

    //! KEY_M
    if (jFizz.events.keyboard[77]) {
        jFizz.myZoom += 0.1;
    }
};

jFizz.handleMouse = function(delta) {
    if (jFizz.events.mouse.button) {
        if (jFizz.events.mouse.position.x >= (gl.viewportWidthHalf) + 128) {
            jFizz.activeCamera.angle += 7.0 * (delta / 1000.0);
            jFizz.activeCamera.point[0] = Math.sin(jFizz.activeCamera.angle);
            jFizz.activeCamera.point[2] = -Math.cos(jFizz.activeCamera.angle);
        } else if (jFizz.events.mouse.position.x < (gl.viewportWidthHalf) - 128) {
            jFizz.activeCamera.angle -= 7.0 * (delta / 1000.0);
            jFizz.activeCamera.point[0] = Math.sin(jFizz.activeCamera.angle);
            jFizz.activeCamera.point[2] = -Math.cos(jFizz.activeCamera.angle);
        }

        if (jFizz.events.mouse.position.y >= (gl.viewportHeightHalf) + 100) {
            jFizz.activeCamera.look -= 7.0 * (delta / 1000.0);
            jFizz.activeCamera.point[1] = Math.sin(jFizz.activeCamera.look);
        } else if (jFizz.events.mouse.position.y < (gl.viewportHeightHalf) - 128) {
            jFizz.activeCamera.look += 7.0 * (delta / 1000.0);
            jFizz.activeCamera.point[1] = Math.sin(jFizz.activeCamera.look);
        }
    }
};

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
        '    gl_FragColor = vec4(uDiffuseColor, uOpacity);'
    ].join('\n'),
    fog_head_fragment: [
        '#ifdef USE_FOG',
        '    uniform vec3 uFogColor;',
        '    #ifdef FOG_EXP2',
        '        uniform float uFogDensity;',
        '    #else',
        '        uniform float uFogNear;',
        '    #endif',
        '#endif'
    ].join('\n'),
    fog_fragment: [
        '#ifdef USE_FOG',
        '    float _Depth = gl_FragCoord.z / gl_FragCoord.w;',
        '    #ifdef FOG_EXP2',
        '        const float _LOG2 = 1.442695;',
        '        float _FogFactor = exp2(-uFogDensity * uFogDensity * _Depth * _Depth * _LOG2);',
        '        _Fogfactor = 1.0 - clamp(_Fogfactor, 0.0, 1.0);',
        '    #else',
        '        float _FogFactor = smoothstep(uFogNear, uFogFar, _Depth);',
        '    #endif',
        '    gl_FragColor = mix(gl_FragColor, vec4(uFogColor, gl_FragColor.w), _FogFactor);',
        '#endif'
    ].join('\n'),
    light_head_fragment: [
        '#ifdef USE_LIGHTING',
        '    varying vec3 vLightWeighting;',
        '#endif'
    ].join('\n'),
    light_fragment: [
        '#ifdef USE_LIGHTING',
        '    gl_FragColor = vec4(gl_FragColor.rgb * vLightWeighting, gl_FragColor.a);',
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
    scanline_head_fragment: [
        'void effect_scanline() {',
        '    vec3 col = vec3(0.1, 0.2 * (0.5 + sin(gl_FragCoord.y * 3.1456 + uTime * 3.0)), 0.1);',
        '    float d = clamp((0.75 + sin(gl_FragCoord.x * 3.1456 + uTime * 1.3) * 0.5), 0.0, 1.0);',
        '    col += vec3(d * 0.5, d, d * 0.85);',
        '    gl_FragColor = gl_FragColor * vec4(col, 1.0);',
        '}',
    ].join('\n'),
    scanline_fragment: [
        '    effect_scanline();',
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

var extend = {
    head: [
        '',
        ''
    ].join('\n'),
    body: [
        '',
        ''
    ].join('\n')
};


jFizz.shaderCreator = {
    'basic': {
        vertexShader: [
            jFizz.shaderChunk['texture_head_vertex'],
            jFizz.shaderChunk['color_head_vertex'],
            jFizz.shaderChunk['light_head_vertex'],
            'void main() {',
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
            'void main() {',
                jFizz.shaderChunk['default_fragment'],
                jFizz.shaderChunk['texture_fragment'],
                jFizz.shaderChunk['color_fragment'],
                jFizz.shaderChunk['light_fragment'],
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
            jFizz.shaderChunk['scanline_head_fragment'],
            extend.head,
            'void main(void) {',
                jFizz.shaderChunk['default_fragment'],
                jFizz.shaderChunk['texture_fragment'],
                jFizz.shaderChunk['color_fragment'],
                jFizz.shaderChunk['light_fragment'],
                jFizz.shaderChunk['scanline_fragment'],
                extend.body,
            '}',
        ].join('\n'),
    },
    'no-depth': {
        vertexShader: [
            jFizz.shaderChunk['texture_head_vertex'],
            jFizz.shaderChunk['color_head_vertex'],
            'void main() {',
            '    vec4 _MVPosition;',
            '    _MVPosition = vec4(aVertexPosition, 1.0);',
            '    gl_Position = uPMatrix * _MVPosition;',
                jFizz.shaderChunk['texture_vertex'],
                jFizz.shaderChunk['color_vertex'],
            '}'
        ].join('\n'),
        fragmentShader: [
            jFizz.shaderChunk['texture_head_fragment'],
            jFizz.shaderChunk['color_head_fragment'],
            'void main() {',
                jFizz.shaderChunk['default_fragment'],
                jFizz.shaderChunk['texture_fragment'],
                jFizz.shaderChunk['color_fragment'],
            '}'
        ].join('\n')
    }
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
        canvas.width = self.innerWidth;
        canvas.height = self.innerHeight;

        gl.viewportWidth = canvas.width;
        gl.viewportWidthHalf = canvas.width / 2;
        gl.viewportHeight = canvas.height;
        gl.viewportHeightHalf = canvas.height / 2;
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

jFizz.getShaderFactory = function(name, type, prefix) {
    var str = '';

    var shader;
    var stype;
    if (type == 'fragment') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        stype = 'fragmentShader';
    } else if (type == 'vertex') {
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

jFizz.setMatrixUniforms = function(program) {
    gl.uniformMatrix4fv(program.uniforms['uPMatrix'], false, jFizz.shader.matrices['projection']);
    gl.uniformMatrix4fv(program.uniforms['uMVMatrix'], false, jFizz.shader.matrices['modelview']);

    //! NOTE: update planes every set
    jFizz.frustum.planes = jFizz.createFrustum();

    //! NOTE: create normal matrix
    var normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, jFizz.shader.matrices['modelview']);
    mat3.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix3fv(program.uniforms['uNMatrix'], false, normalMatrix);
};

jFizz.push = function() {
    var copy = mat4.create();
    mat4.copy(copy, jFizz.shader.matrices['modelview']);
    jFizz.matrixStack.push(copy);
};

jFizz.pop = function() {
    if (jFizz.matrixStack.length == 0) {
        throw 'Invalid call to pop method!';
    }

    jFizz.shader.matrices['modelview'] = jFizz.matrixStack.pop();
};

jFizz.log = function(tag, message) {
    if (tag == jFizz.tag.ERROR) {
        console.log(tag + message);
    } else {
        console.log(tag + message);
    }
};

jFizz.createShaderProgram = function(name, defines) {
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
        '#ifdef USE_NORMAL',
        '    attribute vec3 aVertexNormal;',
        '#endif',
        '#ifdef USE_COLOR',
        '    attribute vec4 aVertexColor;',
        '#endif',
        '#ifdef USE_TEXTURE',
        '    attribute vec2 aVertexTextureCoord;',
        '#endif',
        '',
    ].join('\n');

    var prefix_fragment = [
        'precision mediump float;', '',
        customDefines, '',
        'uniform vec3 uResolution;',
        'uniform vec3 uDiffuseColor;',
        'uniform float uOpacity;',
        'uniform float uTime;',
        '#ifdef USE_TEXTURE',
        '    uniform sampler2D uSampler;',
        '#endif',
        '',
    ].join('\n');

    var fragmentShader = jFizz.getShaderFactory(name, 'fragment', prefix_fragment);
    var vertexShader = jFizz.getShaderFactory(name, 'vertex', prefix_vertex);

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

    jFizz.info.memory.programs++;
    return program;
};

jFizz.initShaders = function() {
    var defines = ['USE_COLOR', 'USE_TEXTURE'];
    jFizz.shader.programs[0] = jFizz.createShaderProgram('basic', defines);
    jFizz.shader.programs[1] = jFizz.createShaderProgram('full-basic', defines);

    defines = ['USE_TEXTURE'];
    jFizz.shader.programs[2] = jFizz.createShaderProgram('no-depth', defines);
};

jFizz.initPhysics = function() {
    var world = new CANNON.World();
    world.gravity.set(0, -9.87, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    jFizz.physics.world = world;
};

jFizz.initTextures = function() {
    jFizz.sharedResources.textures[0] = getTexture('assets/images/fizz.png', {
        mipmap: false,
        filter: 'nearest'
    });
    jFizz.sharedResources.textures[1] = getTexture('assets/images/qrcode.png');

    function getTexture(url, opts) {
        var id;

        if (opts === undefined) {
            id = jFizz.loadTexture(url);
        } else {
            id = jFizz.loadTexture(url, opts);
        }
        id.uuid = jFizz.Math.generateUUID();

        return id;
    }
};

jFizz.initBuffers = function() {
    jFizz.GeometryCreator.generateSpriteQuadBuffer(jFizz.sceneManager.scenes['myScene'], 0, 'center', {
        w: 440,
        h: 170,
        ul: 'default',
        lr: vec2.fromValues(440, 170)
    }, 'default', true, false);
    //jFizz.GeometryCreator.generateCubeBuffer(jFizz.sceneManager.scenes['myScene'], 1, 1.0, 1.0, false);
    //jFizz.GeometryCreator.generateSkyDomeBuffer(jFizz.sceneManager.scenes['myScene'], 0);
};

jFizz.GeometryCreator = {
    generateSpriteQuadBuffer: function(scene, tid, position, dimension, opacity, transparent, useTextureDimension, priority) {
        var objectCount = scene.objects.length;
        var geometry = new jFizz.ObjectMesh();
        var texture = jFizz.sharedResources.textures[tid];
        scene.objects.push(geometry);

        var object = scene.objects[objectCount];
        object.faceType = gl.TRIANGLE_FAN;
        object.lastTexCount = tid;
        object.objType = 'sprite';
        object.priority = (priority === undefined) ? 75 : priority;
        object.buffers = [];

        if (dimension === undefined || dimension == 'default') {
            dimension = {
                w: texture.image.width,
                h: texture.image.height,
                ul: vec2.fromValues(0, 0),
                lr: vec2.fromValues(texture.image.width, texture.image.height)
            };
        } else {
            dimension.w = (dimension.w === undefined || dimension.w == 'default') ? texture.image.width : dimension.w;
            dimension.h = (dimension.h === undefined || dimension.h == 'default') ? texture.image.height : dimension.h;
            dimension.ul = (dimension.ul === undefined || dimension.ul == 'default') ? vec2.fromValues(0, 0) : dimension.ul;
            dimension.lr = (dimension.lr === undefined || dimension.lr == 'default') ? vec2.fromValues(texture.image.width, texture.image.height) : dimension.lr;
        }

        if (useTextureDimension !== undefined) {
            if (useTextureDimension) {
                f.w = texture.image.width;
                f.h = texture.image.height;
                f.lr = vec2.fromValues(texture.image.width, texture.image.height);
            }
        }

        if (position === undefined || position == 'default' || position == 'center') {
            if (position == 'center') {
                position = vec2.fromValues(gl.viewportWidthHalf - (dimension.w / 2),
                                           gl.viewportHeightHalf - (dimension.h / 2));
            } else {
                position = vec2.fromValues(0.0, 0.0);
            }
        }

        var f = {
            w: dimension.w,
            h: dimension.h,
            ul: dimension.ul,
            lr: dimension.lr
        };

        var p = {
            x: position[0],
            y: position[1]
        };

        var d = {
            w: f.w,
            h: f.h,
            s: texture.image.width,
            t: texture.image.height
        };

        var c = {
            ul: vec2.fromValues(f.ul[0] / d.s, (d.t - f.ul[1]) / d.t),
            lr: vec2.fromValues(f.lr[0] / d.s, (d.t - f.lr[1]) / d.t),
        };

        var definitions = {
            vertices: [
                p.x, p.y, 0.0,
                p.x, p.y + d.h, 0.0,
                p.x + d.w, p.y + d.h, 0.0,
                p.x + d.w, p.y, 0.0
            ],
            colors: [
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
                1.0, 1.0, 1.0, 1.0,
            ],
            uvs: [
                c.ul[0], c.ul[1],
                c.ul[0], c.lr[1],
                c.lr[0], c.lr[1],
                c.lr[0], c.ul[1]
            ],
            indices: [0, 1, 2, 3]
        };

        var instances = {
            vertices: {
                itemSize: 3,
                numItems: 4
            },
            colors: {
                itemSize: 4,
                numItems: 4
            },
            uvs: {
                itemSize: 2,
                numItems: 4
            },
            indices: {
                itemSize: 1,
                numItems: 4
            }
        };

        object.userdata = {
            f: f,
            p: p,
            d: definitions,
            i: instances
        };

        var buffers = {};
        var identifiers = ['vertices', 'colors', 'uvs', 'indices'];
        for (var i = 0, l = identifiers.length; i < l; i++) {
            var id = identifiers[i];

            var buffer = gl.createBuffer();
            buffer.itemSize = instances[id].itemSize;
            buffer.numItems = instances[id].numItems;

            if (id != 'indices') {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(definitions[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            } else {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(definitions[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }

            buffers[id] = buffer;
            buffers[id].name = id;
        }

        object.buffers[0] = buffers;
        object.initialized = true;

        var uuid = jFizz.Math.generateUUID();
        var materials = [
            {
                uuid: uuid,
                color: {
                    diffuse: 16777215,
                    ambient: 16777215
                },
                opacity: (opacity === undefined || opacity == 'default') ? 1.0 : opacity,
                transparent: (transparent === undefined || transparent == 'default') ? false : transparent
            }
        ];

        jFizz.sharedResources.materials.push(materials);
        object.materials = [uuid];

        //! NOTE: empty buffers
        definitions = {},
        instances = {},
        materials = [];
    },
    generateCubeBuffer: function(scene, tid, size, opacity, transparent, priority) {
        var objectCount = scene.objects.length;
        var geometry = new jFizz.ObjectMesh();
        scene.objects.push(geometry);

        var object = scene.objects[objectCount];
        object.faceType = gl.TRIANGLES;
        object.lastTexCount = tid;
        object.objType = 'model';
        object.priority = (priority === undefined) ? 75 : priority;
        object.buffers = [];

        var buffers = {};
        var scale = 1.0 * 0.5;
        scale *= (size === undefined) ? 1.0 : size;

        var definitions = {
            vertices: [
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
            ],
            colors: [
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
            ],
            normals: [
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
                 1, -1, -1
            ],
            uvs: [
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
            ],
            indices: [
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
            ]
        };

        var instances = {
            vertices: {
                itemSize: 3,
                numItems: 12
            },
            colors: {
                itemSize: 4,
                numItems: 12
            },
            normals: {
                itemSize: 3,
                numItems: 12
            },
            uvs: {
                itemSize: 2,
                numItems: 12
            },
            indices: {
                itemSize: 1,
                numItems: 36
            }
        };

        var identifiers = ['vertices', 'colors', 'normals', 'uvs', 'indices'];
        for (var i = 0, l = identifiers.length; i < l; i++) {
            var id = identifiers[i];

            var buffer = gl.createBuffer();
            buffer.itemSize = instances[id].itemSize;
            buffer.numItems = instances[id].numItems;

            if (id != 'indices') {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(definitions[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            } else {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(definitions[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }

            buffers[id] = buffer;
            buffers[id].name = id;
        }

        object.buffers[0] = buffers;
        object.initialized = true;

        var uuid = jFizz.Math.generateUUID();
        var materials = [
            {
                uuid: uuid,
                color: {
                    diffuse: 16777215,
                    ambient: 16777215
                },
                opacity: (opacity === undefined || opacity == 'default') ? 1.0 : opacity,
                transparent: (transparent === undefined || transparent == 'default') ? false : transparent
            }
        ];

        jFizz.sharedResources.materials.push(materials);
        object.materials = [uuid];

        //! NOTE: empty buffers
        definitions = {},
        instances = {},
        materials = [];
    },
    generateSkyDomeBuffer: function(scene, tid, hr, vr, tp, sp, r, opacity, transparent, priority) {
        var objectCount = scene.objects.length;
        var geometry = new jFizz.ObjectMesh();
        scene.objects.push(geometry);

        var object = scene.objects[objectCount];
        object.faceType = gl.TRIANGLES;
        object.lastTexCount = tid;
        object.objType = 'skydome';
        object.priority = (priority === undefined) ? 75 : priority;
        object.buffers = [];

        var horizontalRes = (hr === undefined || hr == 'default') ? 192.0 : hr,
            verticalRes = (vr === undefined || vr == 'default') ? 192.0 : vr,
            texturePerc = (tp === undefined || tp == 'default') ? -1.0 : tp,
            spherePerc = (sp === undefined || sp == 'default') ? 1.0 : sp,
            radius = (r === undefined || r == 'default') ? 250.0 : r;

        var azimuth;
        var azimuthStep = (Math.PI * 2.0) / horizontalRes;

        if (spherePerc < 0.0)
            spherePerc = -spherePerc;
        if (spherePerc > 2.0)
            spherePerc = 2.0;

        var halfPI = (Math.PI / 2.0);
        var elevationStep = spherePerc * halfPI / verticalRes;

        var definitions = {
            vertices: [],
            colors: [],
            normals: [],
            uvs: [],
            indices: []
        };

        var p, t;
        var tcV = texturePerc / verticalRes;
        for (var i = 0, azimuth = 0; i  <= horizontalRes; ++i) {
            var elevation = halfPI;
            var tcU = i / horizontalRes;

            var sinA = Math.sin(azimuth);
            var cosA = Math.cos(azimuth);

            for (var j = 0; j <= verticalRes; ++j) {
                var cosEr = radius * Math.cos(elevation);

                p = [cosEr * sinA, radius * Math.sin(elevation), cosEr * cosA];
                t = [tcU, j * tcV];

                var n = vec3.create();
                n = [-p[0], -p[1], -p[2]];
                vec3.normalize(n, n);

                definitions['vertices'].push(p[0]);
                definitions['vertices'].push(p[1]);
                definitions['vertices'].push(p[2]);

                definitions['colors'].push(1.0);
                definitions['colors'].push(1.0);
                definitions['colors'].push(1.0);
                definitions['colors'].push(1.0);

                definitions['normals'].push(n[0]);
                definitions['normals'].push(n[1]);
                definitions['normals'].push(n[2]);

                definitions['uvs'].push(t[0]);
                definitions['uvs'].push(t[1]);

                elevation -= elevationStep;
            }

            azimuth += azimuthStep;
        }

        for (var i = 0; i < horizontalRes; ++i) {
            definitions['indices'].push(verticalRes + 2 + (verticalRes + 1) * i);
            definitions['indices'].push(1 + (verticalRes + 1) * i);
            definitions['indices'].push(0 + (verticalRes + 1) * i);

            for (var j = 0; j < verticalRes; ++j) {
                definitions['indices'].push(verticalRes + 2 + (verticalRes + 1) * i + j);
                definitions['indices'].push(1 + (verticalRes + 1) * i + j);
                definitions['indices'].push(0 + (verticalRes + 1) * i + j);

                definitions['indices'].push(verticalRes + 1 + (verticalRes + 1) * i + j);
                definitions['indices'].push(verticalRes + 2 + (verticalRes + 1) * i + j);
                definitions['indices'].push(0 + (verticalRes + 1) * i + j);
            }
        }

        var instances = {
            vertices: {
                itemSize: 3,
                numItems: 12
            },
            colors: {
                itemSize: 4,
                numItems: 12
            },
            normals: {
                itemSize: 3,
                numItems: 12
            },
            uvs: {
                itemSize: 2,
                numItems: 12
            },
            indices: {
                itemSize: 1,
                numItems: definitions['indices'].length
            }
        };

        var buffers = {};
        var identifiers = ['vertices', 'colors', 'normals', 'uvs', 'indices'];
        for (var i = 0, l = identifiers.length; i < l; i++) {
            var id = identifiers[i];

            var buffer = gl.createBuffer();
            buffer.itemSize = instances[id].itemSize;
            buffer.numItems = instances[id].numItems;

            if (id != 'indices') {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(definitions[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            } else {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(definitions[id]), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }

            buffers[id] = buffer;
            buffers[id].name = id;
        }

        object.buffers[0] = buffers;
        object.initialized = true;

        var uuid = jFizz.Math.generateUUID();
        var materials = [
            {
                uuid: uuid,
                color: {
                    diffuse: 16777215,
                    ambient: 16777215
                },
                opacity: (opacity === undefined || opacity == 'default') ? 1.0 : opacity,
                transparent: (transparent === undefined || transparent == 'default') ? false : transparent
            }
        ];

        jFizz.sharedResources.materials.push(materials);
        object.materials = [uuid];

        //! NOTE: empty buffers
        definitions = {},
        instances = {},
        materials = [];
    }
};

jFizz.createFrustum = function() {
    var planes = [];

    for (var i = 0; i < 6; i++) {
        planes[i] = vec4.create();
    }

    var m = mat4.create();
    mat4.multiply(m, jFizz.shader.matrices['projection'], jFizz.shader.matrices['modelview']);

    //! NOTE: order [Left, Right, Bottom, Top, Near, Far]
    vec4.set(planes[0], m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
    vec4.set(planes[1], m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
    vec4.set(planes[2], m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
    vec4.set(planes[3], m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
    vec4.set(planes[4], m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
    vec4.set(planes[5], m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);

    //! NOTE: normalize the plane
    for (var i = 0; i < 6; i++) {
        vec4.normalize(planes[i], planes[i]);
    }

    return planes;
};

jFizz.checkAgainstFrustum = function(object, p, r) {
    for (var i = 0; i < 6; i++) {
        var plane = jFizz.frustum.planes[i];
        var distance = vec4.dot(plane, [p[0], p[1], p[2], 1.0]);

        if (distance + r < 0.0) {
            object.visible = false;
            return;
        }
    }

    object.visible = true;
};

jFizz.loadImage = function(id, url, opts) {
    var image = new Image();
    image.src = url;
    image.onload = function() {
        if (opts === undefined){
            handleTexture(id);
        } else {
            handleTexture(id, opts);
        }

        function handleTexture(texture, opts) {
            if (texture !== undefined) {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                var settings = {
                    mipmap: true,
                    filter: 'linear',
                    anisotropy: 6
                };

                if (opts !== undefined) {
                    settings.mipmap = (opts.mipmap === undefined) ? settings.mipmap : opts.mipmap;
                    settings.filter = (opts.filter === undefined) ? settings.filter : opts.filter;
                    settings.anisotropy = (opts.anisotropy === undefined) ? settings.anisotropy : opts.anisotropy;
                }

                if (jFizz.Math.isPowerOfTwo(image.width) && jFizz.Math.isPowerOfTwo(image.height)) {
                    if (settings.mipmap) {
                        if (settings.filter == 'linear') {
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                        } else {
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
                        }

                        if (settings.anisotropy !== undefined) {
                            var ext = gl.getExtension( 'EXT_texture_filter_anisotropic' ) ||
                                gl.getExtension( 'MOZ_EXT_texture_filter_anisotropic' ) ||
                                gl.getExtension( 'WEBKIT_EXT_texture_filter_anisotropic' );
                            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, settings.anisotropy);
                        }

                        gl.generateMipmap(gl.TEXTURE_2D);
                    } else {
                        if (settings.filter == 'linear') {
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        } else {
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                        }
                    }
                } else {
                    if (settings.filter == 'linear') {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    } else {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    }
                }

                gl.bindTexture(gl.TEXTURE_2D, null);
            }
        }
    };

    return image;
};

jFizz.loadTexture = function(url, opts) {
    var id;

    id = gl.createTexture();
    if (opts === undefined) {
        id.image = jFizz.loadImage(id, url);
    } else {
        id.image = jFizz.loadImage(id, url, opts);
    }

    jFizz.info.memory.textures++;
    return id;
};

jFizz.translate = function(mat, vec) {
    var x = vec[0], y = vec[1], z = vec[2];

    mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
    mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
    mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
    mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
};

jFizz.drawScene = function() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var ratio = gl.viewportWidth / gl.viewportHeight;
    mat4.perspective(jFizz.shader.constants['perspective'], 45.0, ratio, 0.001, 1000.0);
    mat4.ortho(jFizz.shader.constants['ortho'], 0, gl.viewportWidth, gl.viewportHeight, 0.0, -1.0, 1.0);

    //! NOTE: set default projection view
    jFizz.shader.matrices['projection'] = jFizz.shader.constants['perspective'];

    var point = vec3.create();
    vec3.add(point, jFizz.activeCamera.eye, jFizz.activeCamera.point);

    mat4.lookAt(jFizz.shader.matrices['view'],
                jFizz.activeCamera.eye,     //! eye position
                point,                  //! point target
                jFizz.activeCamera.up);     //! vector pointing up

    mat4.identity(jFizz.shader.matrices['model']);
    mat4.multiply(jFizz.shader.matrices['modelview'], jFizz.shader.matrices['view'], jFizz.shader.matrices['model']);

    for (var i = 0, l = jFizz.myAssets.length; i < l; i++) {
        if (jFizz.sceneManager.scenes['myScene'].objects[i] === undefined) return;
    }

    for (var i = 0, l = jFizz.shader.programs.length; i < l; i++) {
        var program = jFizz.shader.programs[i];
        if (program !== undefined) {
            gl.useProgram(program);
            jFizz.setMatrixUniforms(program);
            gl.useProgram(null);
        }
    }

    jFizz.info.render.calls = 0;
    jFizz.info.render.vertices = 0;
    jFizz.info.render.indices = 0;
    jFizz.info.render.points = 0;

    jFizz.sceneManager.render();
};

jFizz.animate = function() {
    var currentTime = new Date().getTime();
    if (currentTime != jFizz.time.lapseTime) {
        var deltaTime = currentTime - jFizz.time.lapseTime;
        jFizz.myRotY += (30.0 * (deltaTime)) / 1000.0;
        jFizz.myRotX += (30.0 * (deltaTime)) / 1000.0;
        jFizz.time.lapseTime = currentTime;

        for (var i = 0, l = jFizz.shader.programs.length; i < l; i++) {
            var program = jFizz.shader.programs[i];
            if (program !== undefined) {
                gl.useProgram(program);
                gl.uniform1f(program.uniforms['uTime'], deltaTime);
                gl.useProgram(null);
            }
        }

        jFizz.sceneManager.animate(deltaTime);
        jFizz.handleKeys(deltaTime);
        jFizz.handleMouse(deltaTime);
        jFizz.physics.world.step(deltaTime);
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
    }(),
    degToRad: function(a) {
        return a * Math.PI / 180;
    },
    radToDeg: function(a) {
        return a * 180 / Math.PI;
    },
    isPowerOfTwo: function(v) {
        return (v & (v - 1)) === 0 && v !== 0;
    }
};

jFizz.SceneManager = function() {
    this.uuid = jFizz.Math.generateUUID();
    this.scenes = {};
    this.info = {
        scenes: 0
    };
    this.current = 'myScene';
};

jFizz.SceneManager.prototype = {
    constructor: jFizz.SceneManager,
    changeScene: function(s) {
        if (this.scenes[s] !== undefined) {
            this.current = s;
        }
    },
    add: function(s, scene) {
        if (scene === undefined && !(scene instanceof jFizz.ObjectScene)) {
            return;
        }

        if (this.scenes[s] === undefined) {
            this.scenes[s] = scene;
            this.info.scenes++;
        }
    },
    remove: function(s) {
        if (this.scene[s] !== undefined) {
            if (s != this.current) {
                delete this.scene[s];

                if (this.info.scenes > 0) {
                    this.info.scenes--;
                }
            }
        }
    },
    animate: function(delta) {
        var c = this.current;
        if (this.scenes[c] !== undefined) {
            this.scenes[c].animateScene(delta);
        }
    },
    render: function() {
        var c = this.current;
        if (this.scenes[c] !== undefined) {
            this.scenes[c].renderScene();
        }
    }
};

jFizz.ObjectMesh = function() {
    this.uuid = jFizz.Math.generateUUID();
    this.faceType = -1;
    this.attributes = {};
};

jFizz.ObjectMesh.prototype = {
    constructor: jFizz.ObjectMesh,
};

jFizz.ObjectScene = function() {
    this.uuid = jFizz.Math.generateUUID();
    this.objects = [];
};

jFizz.ObjectScene.prototype = {
    constructor: jFizz.ObjectScene,
    morph: function(object, matrix) {
        var position = [0.0, 0.0, jFizz.myZoom];
        if (object.objType == 'model') {
            mat4.translate(matrix, matrix, position);
            mat4.rotate(matrix, matrix, jFizz.Math.degToRad(jFizz.myRotX), [1.0, 0.0, 0.0]);
            mat4.rotate(matrix, matrix, jFizz.Math.degToRad(jFizz.myRotY), [0.0, 1.0, 0.0]);
        }

        return position;
    },
    animateScene: function(delta) {
    },
    renderScene: function() {
        for (var k = 0, c = this.objects.length; k < c; k++) {
            var object = this.objects[k];
            if (object.initialized == false) {
                var identifiers = ['vertices', 'colors', 'normals', 'uvs', 'indices'];

                object.buffers = [];
                object.lastTexCount = jFizz.sharedResources.textures.length;
                for (var n = 0, o = object.textures.length; n < o; n++) {
                    jFizz.sharedResources.textures[object.lastTexCount + n] = jFizz.loadTexture('assets/images/' + object.images[n].url);
                    jFizz.sharedResources.textures[object.lastTexCount + n].uuid = object.images[n].uuid;

                    var buffers = {};
                    for (var i = 0, l = identifiers.length; i < l; i++) {
                        var id = identifiers[i];
                        if (object.attributes[id] !== undefined) {
                            var buffer = gl.createBuffer();

                            buffer.itemSize = object.attributes[id].itemSize;
                            buffer.numItems = object.attributes[id].numItems;

                            if (id != 'indices') {
                                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(object.attributes[id][n]), gl.STATIC_DRAW);
                                gl.bindBuffer(gl.ARRAY_BUFFER, null);
                            } else {
                                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(object.attributes[id][n]), gl.STATIC_DRAW);
                                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
                            }

                            buffers[id] = buffer;
                            buffers[id].name = id;
                        }
                    }

                    object.buffers[n] = buffers;
                    object.initialized = true;

                    //! NOTE: set to default priority
                    object.priority = 65;

                    //! NOTE: clear buffers
                    object.attributes[n] = {};
                }
            }

            var identity = mat4.create();
            mat4.identity(identity);
            var position = this.morph(object, identity);
            var radius = 1.0;

            object.matrix = identity;
            object.visible = false;

            jFizz.checkAgainstFrustum(object, position, radius);
            if (object.visible == true && object.objType != 'sprite') {
                if (object.objType == 'model') {
                    gl.disable(gl.CULL_FACE);
                    this.draw(object, 0);
                    gl.enable(gl.CULL_FACE);
                } else if (object.objType == 'skybox') {
                    gl.cullFace(gl.FRONT);
                    this.draw(object, 0);
                    gl.cullFace(gl.BACK);
                } else {
                    this.draw(object, 0);
                }
            }
        }

        //! NOTE: render last ortho elements
        for (var k = 0, c = this.objects.length; k < c; k++) {
            var object = this.objects[k];
            if (object.objType == 'sprite') {
                gl.disable(gl.CULL_FACE);
                this.drawSprite(object, 2);
                gl.enable(gl.CULL_FACE);
            }
        }
    },
    draw: function(object, pid) {
        var program = jFizz.shader.programs[pid];

        jFizz.shader.matrices['projection'] = jFizz.shader.constants['perspective'];

        gl.useProgram(program);
        gl.uniform3fv(program.uniforms['uResolution'], [gl.viewportWidth, gl.viewportHeight, 1.0]);

        var materials = [];
        var sharedMaterials = jFizz.sharedResources.materials;
        for (var i = 0, l = object.materials.length; i < l; i++) {
            for (var j = 0, k = sharedMaterials.length; j < k; j++) {
                for (var n = 0, m = sharedMaterials[j].length; n < m; n++) {
                    if (object.materials[i] == sharedMaterials[j][n].uuid) {
                        materials.push(sharedMaterials[j][n]);
                    }
                }
            }
        }

        for (var n = 0, o = object.buffers.length; n < o; n++) {
            var buffet = object.buffers[n];

            var diffuse = jFizz.setHex(materials[n].color.diffuse);
            var ambient = jFizz.setHex(materials[n].color.ambient);
            var opacity = materials[n].opacity;
            var texture = jFizz.sharedResources.textures[object.lastTexCount + n];
            var location = [0.0, 0.0, -10.0];
            var light = [1.0, 1.0, 10];

            gl.uniform3fv(program.uniforms['uDiffuseColor'], diffuse);
            gl.uniform1f(program.uniforms['uOpacity'], opacity);

            gl.uniform3fv(program.uniforms['uAmbientColor'], ambient);
            gl.uniform3fv(program.uniforms['uLightingLocation'], location);
            gl.uniform3fv(program.uniforms['uLightingColor'], light);

            jFizz.push();
            if (object.matrix !== undefined) {
                mat4.multiply(jFizz.shader.matrices['modelview'], jFizz.shader.matrices['modelview'], object.matrix);
            }
            jFizz.setMatrixUniforms(program);

            var identifiers = ['vertices', 'colors', 'uvs', 'normals'];
            for (var i = 0, l = jFizz.identifiers['attribute'].length; i < l; i++) {
                if (identifiers.length != l) {
                    jFizz.log(jFizz.tag.ERROR, 'Identifiers and attributes lengths are not the same.');
                    break;
                }

                var aid = jFizz.identifiers['attribute'][i];
                var bid = identifiers[i];

                if (program.attributes[aid] != -1) {
                    if (buffet[bid] !== undefined) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffet[bid]);
                        gl.vertexAttribPointer(program.attributes[aid], buffet[bid].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, null);
                    }
                }
            }

            if (program.attributes['aVertexTextureCoord'] != -1) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(program.uniforms['uSampler'], 0);
            }

            if (materials[n].transparent) {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                gl.enable(gl.BLEND);
                gl.disable(gl.DEPTH_TEST);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffet['indices']);
            for (var i = 0, l = jFizz.identifiers['attribute'].length; i < l; i++) {
                var id = jFizz.identifiers['attribute'][i];
                if (program.attributes[id] != -1) {
                    gl.enableVertexAttribArray(program.attributes[id]);
                }
            }
            gl.drawElements(object.faceType, buffet['indices'].numItems, gl.UNSIGNED_SHORT, 0);
            jFizz.info.render.calls++;
            jFizz.info.render.vertices += buffet['indices'].numItems;
            jFizz.info.render.indices += buffet['indices'].numItems / 3;
            jFizz.info.render.points += buffet['indices'].numItems / 3;
            for (var i = jFizz.identifiers['attribute'].length, l = 0; i-- > l;) {
                var id = jFizz.identifiers['attribute'][i];
                if (program.attributes[id] != -1) {
                    gl.disableVertexAttribArray(program.attributes[id]);
                }
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            if (materials[n].transparent) {
                gl.disable(gl.BLEND);
                gl.enable(gl.DEPTH_TEST);
            }
            jFizz.pop();
        }

        materials = [];
        gl.useProgram(null);
    },
    drawSprite: function(object, pid) {
        var program = jFizz.shader.programs[pid];

        jFizz.shader.matrices['projection'] = jFizz.shader.constants['ortho'];

        gl.useProgram(program);
        gl.uniform3fv(program.uniforms['uResolution'], [gl.viewportWidth, gl.viewportHeight, 1.0]);

        var materials = [];
        var sharedMaterials = jFizz.sharedResources.materials;
        for (var i = 0, l = object.materials.length; i < l; i++) {
            for (var j = 0, k = sharedMaterials.length; j < k; j++) {
                for (var n = 0, m = sharedMaterials[j].length; n < m; n++) {
                    if (object.materials[i] == sharedMaterials[j][n].uuid) {
                        materials.push(sharedMaterials[j][n]);
                    }
                }
            }
        }

        for (var n = 0, o = object.buffers.length; n < o; n++) {
            var buffet = object.buffers[n];
            var diffuse = jFizz.setHex(materials[n].color.diffuse);
            var opacity = materials[n].opacity;
            var texture = jFizz.sharedResources.textures[object.lastTexCount + n];

            gl.uniform3fv(program.uniforms['uDiffuseColor'], diffuse);
            gl.uniform1f(program.uniforms['uOpacity'], opacity);

            var f = object.userdata.f;
            var p = object.userdata.p;
            var d = {
                w: f.w,
                h: f.h,
                s: texture.image.width,
                t: texture.image.height
            };

            var c = {
                ul: vec2.fromValues(f.ul[0] / d.s, (d.t - f.ul[1]) / d.t),
                lr: vec2.fromValues(f.lr[0] / d.s, (d.t - f.lr[1]) / d.t),
            };

            var definitions = {
                vertices: object.userdata.d.vertices,
                colors: object.userdata.d.colors,
                uvs: [
                    c.ul[0], c.ul[1],
                    c.ul[0], c.lr[1],
                    c.lr[0], c.lr[1],
                    c.lr[0], c.ul[1]
                ],
                indices: object.userdata.d.indices
            };

            var instances = object.userdata.i;

            var identifiers = ['vertices', 'colors', 'uvs', 'normals', 'indices'];
            for (var i = 0, l = identifiers.length; i < l; i++) {
                var id = identifiers[i];

                if (buffet[id] !== undefined) {
                    if (id != 'indices') {
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffet[id]);
                        if (instances[id].itemSize != buffet[id].itemSize) {
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(definitions[id]), gl.DYNAMIC_DRAW);
                            buffet[id].itemSize = instances[id].itemSize;
                        } else {
                            gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(definitions[id]));
                        }
                    } else {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffet[id]);
                        if (instances[id].itemSize != buffet[id].itemSize) {
                            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(definitions[id]), gl.DYNAMIC_DRAW);
                            buffet[id].itemSize = instances[id].itemSize;
                        } else {
                            gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(definitions[id]));
                        }
                    }
                }
            }

            jFizz.push();
            if (object.matrix !== undefined) {
                mat4.multiply(jFizz.shader.matrices['modelview'], jFizz.shader.matrices['modelview'], object.matrix);
            }

            jFizz.setMatrixUniforms(program);

            for (var i = 0, l = jFizz.identifiers['attribute'].length; i < l; i++) {
                if ((identifiers.length - 1) != l) {
                    jFizz.log(jFizz.tag.ERROR, 'Identifiers and attributes lengths are not the same.');
                    break;
                }

                var aid = jFizz.identifiers['attribute'][i];
                var bid = identifiers[i];

                if (program.attributes[aid] != -1) {
                    if (buffet[bid] !== undefined) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, buffet[bid]);
                        gl.vertexAttribPointer(program.attributes[aid], buffet[bid].itemSize, gl.FLOAT, false, 0, 0);
                        gl.bindBuffer(gl.ARRAY_BUFFER, null);
                    }
                }
            }

            if (program.attributes['aVertexTextureCoord'] != -1) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(program.uniforms['uSampler'], 0);
            }

            if (materials[n].transparent) {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                gl.enable(gl.BLEND);
                gl.disable(gl.DEPTH_TEST);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffet['indices']);
            for (var i = 0, l = jFizz.identifiers['attribute'].length; i < l; i++) {
                var id = jFizz.identifiers['attribute'][i];
                if (program.attributes[id] != -1) {
                    gl.enableVertexAttribArray(program.attributes[id]);
                }
            }
            gl.drawElements(object.faceType, buffet['indices'].numItems, gl.UNSIGNED_SHORT, 0);
            jFizz.info.render.calls++;
            jFizz.info.render.vertices += buffet['indices'].numItems;
            jFizz.info.render.indices += buffet['indices'].numItems / 3;
            jFizz.info.render.points += buffet['indices'].numItems / 3;
            for (var i = jFizz.identifiers['attribute'].length, l = 0; i-- > l;) {
                var id = jFizz.identifiers['attribute'][i];
                if (program.attributes[id] != -1) {
                    gl.enableVertexAttribArray(program.attributes[id]);
                }
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

            if (materials[n].transparent) {
                gl.disable(gl.BLEND);
                gl.enable(gl.DEPTH_TEST);
            }
            jFizz.pop();
        }

        gl.useProgram(null);
    },
};

jFizz.setHex = function(hex) {
    hex = Math.floor(hex);

    var r, g, b;
    r = ((hex >> 16 & 255) / 255);
    g = ((hex >> 8 & 255) / 255);
    b = ((hex & 255) / 255);

    return [r, g, b];
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
                var result;
                result = parse(data);

                result.geometry.objType = data.metadata.objType;
                result.geometry.images = result.images;
                result.geometry.textures = result.textures;
                callback(result.geometry, result.materials);
            } else if (data.metadata.type == 'sprite') {
                //! TODO: sprite callback
            }

            function parse(d) {
                var geometry = new jFizz.ObjectMesh();

                var vertices = d.geometries.attributes.vertices,
                    indices = d.geometries.attributes.indices,
                    colors = d.geometries.attributes.colors,
                    normals = d.geometries.attributes.normals
                    uvs = null;

                if (d.geometries.attributes.uvs !== undefined) {
                    uvs = d.geometries.attributes.uvs;
                }

                geometry.attributes['vertices'] = {};
                for (var i = 0, l = vertices.content.length; i < l; i++) {
                    geometry.attributes['vertices'][i] = vertices.content[i];
                }
                geometry.attributes['vertices'].itemSize = vertices.itemSize;
                geometry.attributes['vertices'].numItems = vertices.numItems;

                geometry.attributes['indices'] = {};
                for (var i = 0, l = indices.content.length; i < l; i++) {
                    geometry.attributes['indices'][i] = indices.content[i];
                }
                geometry.attributes['indices'].itemSize = indices.itemSize;
                geometry.attributes['indices'].numItems = indices.numItems;

                if (colors !== undefined) {
                    geometry.attributes['colors'] = {};
                    for (var i = 0, l = colors.content.length; i < l; i++) {
                        geometry.attributes['colors'][i] = colors.content[i];
                    }
                    geometry.attributes['colors'].itemSize = colors.itemSize;
                    geometry.attributes['colors'].numItems = colors.numItems;
                }

                if (normals !== undefined) {
                    geometry.attributes['normals'] = {};
                    for (var i = 0, l = normals.content.length; i < l; i++) {
                        geometry.attributes['normals'][i] = normals.content[i];
                    }
                    geometry.attributes['normals'].itemSize = normals.itemSize;
                    geometry.attributes['normals'].numItems = normals.numItems;
                }

                if (uvs !== undefined) {
                    geometry.attributes['uvs'] = {};
                    for (var i = 0, l = uvs.content.length; i < l; i++) {
                        geometry.attributes['uvs'][i] = uvs.content[i];
                    }
                    geometry.attributes['uvs'].itemSize = uvs.itemSize;
                    geometry.attributes['uvs'].numItems = uvs.numItems;
                }

                var faceType = -1;
                switch (d.geometries.attributes.faceType) {
                    case 'line':
                        break;
                    default:
                    case 'triangle':
                        faceType = gl.TRIANGLES;
                        break;
                }

                geometry.faceType = faceType;
                geometry.materials = d.geometries.attributes.materials;

                if (d.materials !== undefined) {
                    var materials = d.materials;
                    var textures = d.textures;
                    var images = d.images;

                    return { geometry: geometry, materials: materials, textures: textures, images: images };
                }

                return { geometry: geometry, materials: null, textures: null, images: null };
            }
        }
    });

    request.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
    request.send();
};

function animLoop() {
    requestAnimationFrame(animLoop);

    jFizz.drawScene();
    jFizz.animate();
}

jFizz.main = function(c) {
    var canvas = $(c);

    jFizz.init(canvas);
    jFizz.initShaders();
    jFizz.initPhysics();

    jFizz.sceneManager = new jFizz.SceneManager();
    jFizz.sceneManager.add('myScene', new jFizz.ObjectScene);

    jFizz.initTextures();
    jFizz.initBuffers();

    jFizz.myAssets.each(function (item, index) {
        jFizz.loadJSONModel(item, function(geometry, materials) {
            geometry.initialized = false;

            jFizz.sceneManager.scenes['myScene'].objects.push(geometry);
            if (materials !== undefined) {
                jFizz.sharedResources.materials.push(materials);
            }

            //! NOTE: clear buffers
            geometry = {},
            materials = [];
        });
    });

    if (gl) {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clearStencil(0.0);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        gl.enable(gl.CULL_FACE);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);

        document.onkeydown = jFizz.Controls.handleKeyDown;
        document.onkeyup = jFizz.Controls.handleKeyUp;
        document.onmousedown = jFizz.Controls.handleMouseDown;
        document.onmouseup = jFizz.Controls.handleMouseUp;
        document.onmousemove = jFizz.Controls.handleMouseMove;

        animLoop();
    }
};

self.addEvent('domready', function() {
    jFizz.main('my-canvas');
});
