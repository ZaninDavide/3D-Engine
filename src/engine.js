import {
    projMatrix, translateMatrix, rotateAroundXAxis, 
    rotateAroundYAxis, rotateAroundZAxis, combineMatrices,
} from "./matrices.js"
import {normalize} from "./vectors.js"
import { vs, fs } from "./shaders.js"
import { updateStatus, printFrameData } from "./utilities.js"

let WIDTH = 500
let HEIGHT = 500

let gl;
let prog;

let vertices = []
let indices = []
let normals = []
let uvs = []
let vertex_materials = []

let materials = {}
let textures = []

let lightDir = normalize([-2, 10, -5])
let lightColor = [.5, .5, .5]

let time_zero
let lastFPS = 0
let in_play = false

let camera = {
    fov: 50 * Math.PI / 180,
    zNear: 0.05,
    zFar: 1000,
    aspectRatio: WIDTH / HEIGHT,
    shift: [0, 0, 3],
}

let modelRot = [0, 0, 0]

function newContext(){
    var canvas = document.getElementById("webgl")
    WIDTH = window.innerWidth
    HEIGHT = window.innerHeight
    canvas.width = WIDTH
    canvas.height = HEIGHT

    camera.aspectRatio = WIDTH / HEIGHT
    
    var gl = canvas.getContext("webgl2") // experimental-webgl
    if (!gl) {
        throw "Your web browser does not support WebGL!"
    }

    return gl
}

function newProgram(vs_code, fs_code){
    var prog = gl.createProgram()

    var vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vs_code)
    gl.compileShader(vertShader)
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS))
        throw "Could not compile vertex shader:\n\n" + gl.getShaderInfoLog(vertShader)
    gl.attachShader(prog, vertShader)

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, fs_code)
    gl.compileShader(fragShader)
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS))
        throw "Could not compile fragment shader:\n\n" + gl.getShaderInfoLog(fragShader)
    gl.attachShader(prog, fragShader)

    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw "Could not link the shader program! Error: " + gl.LINK_STATUS
    }

    return prog;
}

function init(){
    gl = newContext();
    gl.getExtension('OES_element_index_uint');

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    prog = newProgram(vs(), fs())
}

function startLoop(baseColorArray, specularityArray, metallicArray, baseColorTexturesArray){
    setPlay(true);

    calculateShaders(baseColorArray, specularityArray, metallicArray, baseColorTexturesArray)

    calculateMVP()

    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    
    updateStatus("Rendering");

    draw()
}

function setAttr(type, attr_name, arr) {
    let data;
    let size;
    let gl_type;
    
    switch (type) {
        case "float":
            data = new Float32Array(arr)
            size = 1;
            gl_type = gl.FLOAT;
            break;
        case "vec2":
            data = new Float32Array(arr)
            size = 2;
            gl_type = gl.FLOAT;
            break;
        case "vec3":
            data = new Float32Array(arr)
            size = 3;
            gl_type = gl.FLOAT;
            break;
        case "vec4":
            data = new Float32Array(arr)
            size = 4;
            gl_type = gl.FLOAT;
            break;
        case "int":
            data = new Int32Array(arr)
            size = 1;
            gl_type = gl.INT;
            break;
        case "ivec2":
            data = new Int32Array(arr)
            size = 2;
            gl_type = gl.INT;
            break;
        case "ivec3":
            data = new Int32Array(arr)
            size = 3;
            gl_type = gl.INT;
            break;
        case "ivec4":
            data = new Int32Array(arr)
            size = 4;
            gl_type = gl.INT;
            break;
        case "uint":
            data = new Uint32Array(arr)
            size = 1;
            gl_type = gl.INT;
            break;
        default:
            console.error("Cannot create attribute of type: " + type)
            return;
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(
        gl.ARRAY_BUFFER,
        data,
        gl.STATIC_DRAW
    )

    var attr = gl.getAttribLocation(prog, attr_name)
    gl.enableVertexAttribArray(attr)
    gl.vertexAttribPointer(attr, size, gl_type, false, 0, 0)
}

function setVertices(v){
    vertices = v
    setAttr("vec3", "pos", vertices)
}

function setNormals(n){
    normals = n
    setAttr("vec3", "normal", normals)
}

function setUVs(uv){
    uvs = uv
    setAttr("vec2", "uv", uvs)
}

// https://webglfundamentals.org/webgl/lessons/webgl-shaders-and-glsl.html#uniforms
let uniformLocations = {}
function clearUniformLocations(){
    uniformLocations = {}
}

function setUniform(type, name, value){
    let location = uniformLocations[name];
    if( location === undefined){
        location = gl.getUniformLocation(prog, name)
        uniformLocations[name] = location
    }

    switch (type) {
        case "int":
            gl.uniform1i(location, value);
            break;
        case "float":
            gl.uniform1f (location, value);
            break;
        case "vec2":
            gl.uniform2fv(location, value);
            break;
        case "vec3":
            gl.uniform3fv(location, value);
            break;
        case "vec4":
            gl.uniform4fv(location, value);
            break;
        case "mat2":
            gl.uniformMatrix2fv(location, false, value);
            break;
        case "mat3":
            gl.uniformMatrix3fv(location, false, value);
            break;
        case "mat4":
            gl.uniformMatrix4fv(location, false, value);
            break;
        case "float_array":
            gl.uniform1fv(location, value);
            break;
        case "texture":
            gl.uniform1i(location, value);
            break;
        default:
            console.error("Error: uniform type '" + type + "' not supported.")
    }
}

function setVertexMaterials(vm){
    vertex_materials = vm
}

function setMaterials(m){
    materials = m
}

function setIndices(i){
    indices = i
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        indices.length < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
        gl.STATIC_DRAW
    );
}

function uploadTexture(name, data_url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);
  
    const image = new Image();
    image.onload = function() {
      gl.activeTexture(gl.TEXTURE0 + textures.length);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    srcFormat, srcType, image);
  
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         gl.generateMipmap(gl.TEXTURE_2D);
      } else {
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }

      setUniform("texture", name, textures.length);
    };
    image.src = data_url;
  
    textures.push(name)
    calculateShaders()
  }
  
function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function calculateMaterials(baseColorArray, specularityArray, metallicArray, baseColorTextureArray){
    let matIndices = vertex_materials.map(c => {
        return materials[c] || 0;
    })
    
    setAttr("float", "matIndex", matIndices)
    // ----- MATERIALS DATA -----
    // the values you see down here are simply the default material
    // BASE COLOR / Kd
    setUniform("float_array", "baseColorArray", [0.2, 0.2, 1.0, ...baseColorArray]);
    // SPECULARITY / !ROUGHNESS / SHININESS / Ns
    setUniform("float_array", "specularityArray", [32, ...specularityArray]);
    // illum 1=dielettric 2=metallic
    setUniform("float_array", "metallicArray", [1, ...metallicArray]);
    // illum 1=dielettric 2=metallic
    setUniform("float_array", "baseColorTextureArray", [-1, ...(baseColorTextureArray.map(c => textures.indexOf(c)))]);
    // REFLECTION COLOR / Ks better to use base color also for reflection color
}

function setViewportSize(w, h){
    WIDTH = w
    HEIGHT = h
    camera.aspectRatio = w / h
    gl.viewport(0, 0, w, h)
}

function calculateMVP(){
    setUniform("mat4", "mvp", combineMatrices([
        rotateAroundXAxis(modelRot[0]),
        rotateAroundYAxis(modelRot[1]),
        rotateAroundZAxis(modelRot[2]),
        translateMatrix(camera.shift),
        projMatrix(camera)],
    ));
}

let last_baseColorArray = [];
let last_specularityArray = [];
let last_metallicArray = [];
let last_baseColorTexturesArray = [];

function calculateShaders(
    baseColorArray = last_baseColorArray, 
    specularityArray = last_specularityArray, 
    metallicArray = last_metallicArray, 
    baseColorTexturesArray = last_baseColorTexturesArray
){
    last_baseColorArray = baseColorArray 
    last_specularityArray = specularityArray 
    last_metallicArray = metallicArray 
    last_baseColorTexturesArray = baseColorTexturesArray

    clearUniformLocations()

    prog = newProgram(vs(specularityArray.length + 1), fs(textures));
    gl.useProgram(prog)
    calculateMaterials(baseColorArray, specularityArray, metallicArray, baseColorTexturesArray)

    setUniform("vec3", "lightDir", lightDir);
    setUniform("vec3", "lightColor", lightColor);

    calculateMVP()
}

function draw(){
    lastFPS = printFrameData(time_zero, lastFPS, v => time_zero = v)

    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    var indexType = indices.length < 65536 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
    gl.drawElements(gl.TRIANGLES, indices.length, indexType, 0);
    
    if(in_play) window.requestAnimationFrame(draw);
}

function getViewportSize(){
    return {w: WIDTH, h: HEIGHT}
}

function getCamera(){
    return camera
}

function setCamera(cam){
    camera = cam
}

function setPlay(bool){
    in_play = bool
}

function getPlay(){
    return in_play
}

function setTimeZero(date){
    time_zero = date
}

function setLastFPS(n){
    lastFPS = n
}

function hasMesh(){
    return vertices.length > 0
}

function getModelRot(){
    return modelRot
}

function setModelRot(rot){
    modelRot = rot
}

module.exports = {
    newContext, 
    newProgram, 
    setAttr, 
    setVertices,
    setUVs,
    setNormals,
    setIndices,
    setVertexMaterials,
    setUniform, 
    clearUniformLocations,  
    calculateMVP, 
    setMaterials, 
    calculateShaders, 
    draw,
    setViewportSize,
    getViewportSize,
    init,
    getCamera,
    setCamera,
    setPlay,
    getPlay,
    setTimeZero,
    setLastFPS,
    startLoop,
    hasMesh,
    getModelRot, 
    setModelRot,
    uploadTexture
}

