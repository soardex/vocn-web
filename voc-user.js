var ERROR_LOG_TAG = "[ERROR]: ";
var gl;

function esInit(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl")
        gl.viewport_width = canvas.width;
        gl.viewport_height = canvas.height;
    } catch (e) { }

    if (!gl) {
        console.log(ERROR_LOG_TAG + "Unable to initialize WebGL.");
    }
}

function esGetShader(gl, id) {
    var shader_id = document.getElementById(id);
    if (!shader_id) {
        return null;
    }

    var str = "";

    var k = shader_id.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }

        k = k.nextSibling;
    }

    var shader;
    if (shader_id.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shader_id.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(ERROR_LOG_TAG + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shader_program;
function esInitShaders() {
    var f_shader = esGetShader(gl, "shader-fs");
    var v_shader = esGetShader(gl, "shader-vs");

    shader_program = gl.createProgram();
    gl.attachShader(shader_program, v_shader);
    gl.attachShader(shader_program, f_shader);
    gl.linkProgram(shader_program);

    if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        console.log(ERROR_LOG_TAG + "Could not initialize shaders.");
        console.log(ERROR_LOG_TAG + gl.getProgramInfoLog(shader_program));
    }

    gl.useProgram(shader_program);
    shader_program.vertexPositionAttribute = gl.getAttribLocation(shader_program, "aVertexPosition");
    gl.enableVertexAttribArray(shader_program.vertexPositionAttribute);

    shader_program.p_matrix_uniform = gl.getUniformLocation(shader_program, "uPMatrix");
    shader_program.mv_matrix_uniform = gl.getUniformLocation(shader_program, "uMVMatrix");
}

var mv_matrix = mat4.create();
var p_matrix = mat4.create();

function esSetMatrixUniforms() {
    gl.uniformMatrix4fv(shader_program.p_matrix_uniform, false, p_matrix);
    gl.uniformMatrix4fv(shader_program.mv_matrix_uniform, false, mv_matrix);
}

var triangle_vertex_position_buffer;
var square_vertex_position_buffer;

function esInitBuffers() {
    triangle_vertex_position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangle_vertex_position_buffer);
    var vertices = [
         0.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    triangle_vertex_position_buffer.itemSize = 3;
    triangle_vertex_position_buffer.numItems = 3;
}

function esDrawScene() {
    gl.viewport(0, 0, gl.viewport_width, gl.viewport_height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewport_width / gl.viewport_height, 0.1, 100.0, p_matrix);
    mat4.identity(mv_matrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, triangle_vertex_position_buffer);
    gl.vertexAttribPointer(shader_program.vertexPositionAttribute, triangle_vertex_position_buffer.itemSize, gl.FLOAT, false, 0, 0);
    esSetMatrixUniforms();
    gl.drawArrays(gl.TRIANGLES, 0, triangle_vertex_position_buffer.numItems);
}

function main() {
    var canvas = document.getElementById("my-canvas");
    esInit(canvas);
    esInitShaders();
    esInitBuffers();

    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        esDrawScene();
    }
}


