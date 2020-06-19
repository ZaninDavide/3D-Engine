let vs = (matCount = 1) => `
precision highp float;

attribute vec3 pos;
attribute vec3 normal;
attribute float matIndex;

uniform mat4 mvp;
uniform float baseColorArray[${matCount * 3}];
uniform float specularityArray[${matCount}];
uniform float metallicArray[${matCount}];

varying vec3 vnormal;

varying vec3 matBaseColor;
varying float matSpecularity; // Specular exponent
varying float matMetallic; // 1=dielettric 2=metallic

int matCount = ${matCount};

void main()
{
    gl_Position = mvp * vec4(pos, 1);
    vnormal = normalize(normal);

    // MATERIALS OUTPUT
    if(int(matIndex) < matCount){
        int matX = 3 * int(matIndex);
        int matY = 3 * int(matIndex) + 1;
        int matZ = 3 * int(matIndex) + 2;
        matBaseColor   = vec3(baseColorArray[matX], baseColorArray[matY], baseColorArray[matZ]);
        matSpecularity = specularityArray[int(matIndex)];
        matMetallic = metallicArray[int(matIndex)];
    }else{
        // use default color which always as index 0
        matBaseColor   = vec3(baseColorArray[0], baseColorArray[1], baseColorArray[2]);
        matSpecularity = specularityArray[0];
    }
}
`

let fs = () => `
precision highp float;

uniform vec3 lightDir;
uniform vec3 lightColor;

varying vec3 vnormal;

varying vec3 matBaseColor;
varying float matSpecularity; // Specular exponent
varying float matMetallic; // 1=dielettric 2=metallic

void main() {
    // ambient
    vec3 ambient = 0.05 * matBaseColor;

    // diffuse
    float diff = max(dot(lightDir, vnormal), 0.0);
    vec3 diffuse = diff * matBaseColor;

    // specular = reflection
    vec3 viewDir = normalize(-gl_FragCoord.xyz);
    vec3 reflectDir = reflect(-lightDir, vnormal);
    
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    float spec = pow(max(dot(vnormal, halfwayDir), 0.0), matSpecularity);
    
    vec3 specular = vec3(0.3) * spec;

    gl_FragColor = vec4(atan(ambient + diffuse*lightColor + specular), 1.0);

    // apply gamma correction
    gl_FragColor = vec4(pow(gl_FragColor.xyz, vec3(0.455)), 1.0);
}
`

module.exports = { vs, fs }