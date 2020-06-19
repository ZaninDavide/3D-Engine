function updateStatus(text, type = "log"){
    if(text){
        if(type = "log"){
            console.log(text)
        }else if(type = "warn"){
            console.warn(text)
        }else if(type = "error"){  
            console.error(text)
        }
    }
    document.getElementById("statusLabel").innerHTML = text
}

function printFrameData(time_zero, lastFPS, setTimeZero){
    const now = new Date()
    let FPS = (1000/(now - time_zero)).toFixed(0);
    setTimeZero(now)
    if(lastFPS !== FPS){
        document.getElementById("FPSlabel").innerHTML = "FPS: " + FPS
    }
    return FPS
}

module.exports = { updateStatus, printFrameData }