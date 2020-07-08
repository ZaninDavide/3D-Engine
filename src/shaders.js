let vs = (matCount = 1) => `
precision highp float;

attribute vec3 pos;
attribute vec3 normal;
attribute vec2 uv;
attribute float matIndex;

const int matCount = ${matCount};

uniform mat4 mvp;
uniform float baseColorArray[matCount * 3];
uniform float specularityArray[matCount];
uniform float metallicArray[matCount];
uniform float baseColorTextureArray[matCount];

varying vec3 vnormal;
varying vec2 vUV;
varying vec3 matBaseColor;
varying float matSpecularity; // Specular exponent
varying float matMetallic; // 1=dielettric 2=metallic
varying float matBaseColorTexture; // -1=notexture


void main()
{
    gl_Position = mvp * vec4(pos, 1);
    vnormal = normalize(normal);
    vUV = uv;

    // MATERIALS OUTPUT
    if(int(matIndex) < matCount){
        int matX = 3 * int(matIndex);
        int matY = 3 * int(matIndex) + 1;
        int matZ = 3 * int(matIndex) + 2;
        matBaseColor   = vec3(baseColorArray[matX], baseColorArray[matY], baseColorArray[matZ]);
        matSpecularity = specularityArray[int(matIndex)];
        matMetallic = metallicArray[int(matIndex)];
        matBaseColorTexture = baseColorTextureArray[int(matIndex)];
    }else{
        // use default color which always as index 0
        matBaseColor   = vec3(baseColorArray[0], baseColorArray[1], baseColorArray[2]);
        matSpecularity = specularityArray[0];
    }
}
`

let fs = (textures = []) => {
    
let shader = `
precision highp float;

uniform vec3 lightDir;
uniform vec3 lightColor;

varying vec3 vnormal;
varying vec2 vUV;

varying vec3 matBaseColor;
varying float matSpecularity; // Specular exponent
varying float matMetallic; // 1=dielettric 2=metallic
varying float matBaseColorTexture;

${textures.map(t => `uniform sampler2D ${t.replace(/ +/g, '_')};`).join("\n")}

vec3 sampleTexture(float id, vec2 uv){
    // I use id = -1 to indicate no texture
    ${textures.map((texture_name, id) => `if(abs(id - ${id}.) < .1) { return texture2D(${texture_name.replace(/ +/g, '_')}, fract(uv)).xyz; }`).join("\n")}

    return vec3(1., 0, 1.);
}

void main() {
    // load texture data
    vec3 baseColor;
    if(matBaseColorTexture >= -0.5){
        baseColor = sampleTexture(matBaseColorTexture, vUV);
    }else{
        baseColor = matBaseColor;
    }

    // ambient
    vec3 ambient = 0.05 * baseColor;

    // diffuse
    float diff = max(dot(lightDir, vnormal), 0.0);
    vec3 diffuse = diff * baseColor;

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
console.log(shader)
return shader
}

module.exports = { vs, fs }