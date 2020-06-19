function invertVec(v){
    return v.map(c => -c);
}

function scaleVec(v, n){
    return v.map(c => c*n);
}

function len(v){
    return Math.sqrt(v[0]^2 + v[1]^2 + v[2]^2)
}

function normalize(v){
    return scaleVec(v, 1/len(v))
}

module.exports = {invertVec, scaleVec, len, normalize}