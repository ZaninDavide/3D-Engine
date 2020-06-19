import { calculateMVP, draw, setViewportSize, getCamera, setCamera, getModelRot, setModelRot, getPlay, setPlay, setTimeZero, setLastFPS } from "./engine.js"
import { openFile } from "./objReader.js"
import { updateStatus } from "./utilities.js"

function zoom(event) {
    event.preventDefault();

    let camera = getCamera()
    let delta = event.deltaY / 10 * Math.abs(camera.shift[2]) / 100;
    if(Math.abs(delta) > 20) delta = 20 * Math.sign(delta)
    camera.shift[2] += delta
    if(Math.abs(camera.shift[2]) > 700) camera.shift[2] = 700 * Math.sign(camera.shift[2])

    setCamera(camera)
    calculateMVP()
}

let mouse_pressed = false
let down_pos = [0, 0]
let yShiftBefore;
let modelRotYBefore;

function mouseDown(event){
    let camera = getCamera()
    let modelRot = getModelRot()
    
    mouse_pressed = true
    down_pos = [event.clientX, event.clientY]
    yShiftBefore = camera.shift[1];
    modelRotYBefore = modelRot[1];

    setCamera(camera)
}

function mouseMove(event){
    if(mouse_pressed && event.buttons === 1){
        // left drag
        let delta_x = event.clientX - down_pos[0]

        let modelRot = getModelRot()

        modelRot[1] = modelRotYBefore + delta_x / 100

        setModelRot(modelRot)

        calculateMVP()
    }else if(mouse_pressed && event.buttons === 2){
        // right drag
        event.preventDefault();
        let delta_y = event.clientY - down_pos[1]

        let camera = getCamera()
        camera.shift[1] = yShiftBefore - delta_y / 1200 * (Math.abs(camera.shift[2]) + 1)
        setCamera(camera)

        calculateMVP()
    }
}

function mouseUp(event){
    mouse_pressed = false
}

function xRotSliderChange(event){
    let modelRot = getModelRot()
    modelRot[0] = event.target.value * 3.14 / 180
    setModelRot(modelRot)
    calculateMVP()
}

/*function colorChange(event){
    var value = event.target.value.match(/[A-Za-z0-9]{2}/g);
    let rgb = value.map(function(v) { return parseInt(v, 16) / 255 });
    setUniform(prog, "vec3", "color", rgb);
}*/

function forceStop(){
    setPlay(false)

    updateStatus("Not rendering");
    document.getElementById("FPSlabel").innerHTML = "STOPPED"
}

function forceStart(){
    setPlay(true)

    updateStatus("Rendering");
    document.getElementById("FPSlabel").innerHTML = "FPS: 0"
    setTimeZero(new Date())
    // n = 0
    setLastFPS(0)
    draw()
}

function startStop(){
    let in_play = !getPlay()
    if(in_play){
        forceStart()
    }else{
        forceStop()
    }
}

function onResize(){
    var canvas = document.getElementById("webgl")
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h
    setViewportSize(w, h)
    calculateMVP()
}

function initUI(){
    let canvas = document.getElementById('webgl')
    canvas.onmousemove = mouseMove
    canvas.onmouseup   = mouseUp
    canvas.onmousedown = mouseDown
    canvas.onwheel     = zoom
    
    document.getElementById('objInput').onchange  = openFile
    document.getElementById('objInput').onclick  = forceStop
    document.getElementById('xRotSlider').oninput = xRotSliderChange
    document.getElementById('FPSlabel').onclick   = startStop

    window.onresize = onResize
}

module.exports = {zoom, mouseDown, mouseMove, mouseUp, xRotSliderChange, startStop, onResize, initUI, forceStop, forceStart}