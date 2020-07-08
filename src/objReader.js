import { updateStatus } from "./utilities.js"
import { 
    setPlay, setVertices, setUVs, setNormals, 
    setIndices, setVertexMaterials, clearUniformLocations, 
    setTimeZero, setLastFPS, getCamera, setCamera, getPlay,
    startLoop, hasMesh, setMaterials, uploadTexture
} from "./engine.js"

function readFile(useText){
    let files = Array.from(document.getElementById("objInput").files)

    let file_type_order = [
        "obj",
        "mtl",
        "jpg",
        "jpeg",
        "png",
    ]

    files.sort((a, b) => {
        let va = file_type_order.indexOf(a.name.split(".").slice(-1)[0])
        let vb = file_type_order.indexOf(b.name.split(".").slice(-1)[0])
        return va - vb
    })

    document.querySelector("#objInput").style.display = 'none'; 

    let importFiles = (files, i = 0) => {
        let file = files[i]

        var reader = new FileReader();
    
        // file reading finished successfully
        reader.addEventListener('load', async (e) => {
            var text = e.target.result;
            
            await useText(text, file.name);
    
            if(files.length > i + 1){
                importFiles(files, i + 1)
            }else{  
                setTimeZero(new Date())
                setLastFPS(0)
                startLoop()
            }
        });
    
        // file reading failed
        reader.addEventListener('error', function() {
            alert('Error : Failed to read file');
        });
    
        // file read progress 
        reader.addEventListener('progress', function(e) {
            if(e.lengthComputable == true) {
                updateStatus("Importing progress: " + Math.floor((e.loaded/e.total)*100) + "%");
            }
        });

        updateStatus("Importing '" + file.name + "'");

        updateStatus("Importing progress: 0%");
        if(file.name.endsWith(".jpg") || file.name.endsWith(".jpeg") || file.name.endsWith(".png")){   
            reader.readAsDataURL(file);
        }else{
            reader.readAsText(file);
        }

    }

    importFiles(files)

    document.querySelector("#objInput").style.display = 'block'; 
}

function importMtl(text){
    let materials = {}
    let n = 0

    let baseColorArray = []
    let specularityArray = []
    let metallicArray = [] // 1=dielettric 2=metallic
    let baseColorTexturesArray = []
    let specularityTexturesArray = []

    let lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if(line.startsWith("newmtl ")){
            let words = line.split(/\s+/)
            materials[words[1]] = ++n

            baseColorArray.push(1, 1, 1)
            specularityArray.push(1)
            metallicArray.push(1)
            baseColorTexturesArray.push(undefined)
            specularityTexturesArray.push(undefined)

        }else if(line.startsWith("Ns ")){
            let words = line.split(/\s+/)
            specularityArray[n - 1] = parseFloat(words[1])
        }else if(line.startsWith("Kd ")){
            let words = line.split(/\s+/)
            baseColorArray[3*(n - 1)    ] = parseFloat(words[1])
            baseColorArray[3*(n - 1) + 1] = parseFloat(words[2])
            baseColorArray[3*(n - 1) + 2] = parseFloat(words[3])
        }else if(line.startsWith("illum ")){
            let words = line.split(/\s+/)
            metallicArray[n - 1] = parseInt(words[1])
        }else if(line.startsWith("map_Kd ")){
            let words = line.split(/\s+/)
            baseColorTexturesArray[n - 1] = words.slice(-1)[0].split(/\\/).slice(-1)[0].split(".")[0]
        }else if(line.startsWith("map_Ns ")){
            let words = line.split(/\s+/)
            specularityTexturesArray[n - 1] = words.slice(-1)[0].split(/\\/).slice(-1)[0].split(".")[0]
        }
    })

    return {materials, baseColorArray, specularityArray, metallicArray, baseColorTexturesArray, specularityTexturesArray}
}

function importObj(text, clockwise = false){
    let vertices = []
    let face_normals = []
    let face_uvs = []

    let vertex_materials = []
    let normals = []
    let uvs = []
    let indices = []

    let current_material = undefined

    let lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if(line.startsWith("o ")){
            let words = line.split(/\s+/)
            console.log("> Object: '" + words[1] + "'")
        }else if(line.startsWith("usemtl ")){
            let words = line.split(/\s+/)
            current_material = words[1]
        }else if(line.startsWith("v ")){
            let words = line.split(/\s+/)
            if(words.length === 4){
                vertices.push(parseFloat(words[1]))
                vertices.push(parseFloat(words[2]))
                vertices.push(parseFloat(words[3]))

                normals.push(0)
                normals.push(0)
                normals.push(0)

                uvs.push(0)
                uvs.push(0)

                vertex_materials.push(undefined)
            }else{
                console.log("Only 3D positions are allowed", "warn")
            }
        }else if(line.startsWith("vn ")){
            let words = line.split(/\s+/)
            if(words.length === 4){
                face_normals.push(parseFloat(words[1]))
                face_normals.push(parseFloat(words[2]))
                face_normals.push(parseFloat(words[3]))
            }
        }else if(line.startsWith("vt ")){
            let words = line.split(/\s+/)
            if(words.length === 3){
                face_uvs.push(parseFloat(words[1]))
                face_uvs.push(parseFloat(words[2]))
            }
        }else if(line.startsWith("f ")){
            let words = line.split(/\s+/)
            if(words.length === 4){
                // TRIS

                let data1 = words[1].split("/")
                let data2 = words[2].split("/")
                let data3 = words[3].split("/")

                let vi1 = parseInt(data1[0]) - 1
                let vi2 = parseInt(data2[0]) - 1
                let vi3 = parseInt(data3[0]) - 1

                let ti1 = parseInt(data1[1]) - 1
                let ti2 = parseInt(data2[1]) - 1
                let ti3 = parseInt(data3[1]) - 1

                let ni1 = parseInt(data1[2]) - 1
                let ni2 = parseInt(data2[2]) - 1
                let ni3 = parseInt(data3[2]) - 1

                if(data1.length < 2) ni1 = vi1
                if(data2.length < 2) ni2 = vi2
                if(data3.length < 2) ni3 = vi3

                if(data1.length < 1) ti1 = vi1
                if(data2.length < 1) ti2 = vi2
                if(data3.length < 1) ti3 = vi3

                // uvs

                uvs[2*vi1    ] = face_uvs[2*ti1    ] // x
                uvs[2*vi1 + 1] = face_uvs[2*ti1 + 1] // y

                uvs[2*vi2    ] = face_uvs[2*ti2    ] // x
                uvs[2*vi2 + 1] = face_uvs[2*ti2 + 1] // y

                uvs[2*vi3    ] = face_uvs[2*ti3    ] // x
                uvs[2*vi3 + 1] = face_uvs[2*ti3 + 1] // y

                // normals

                normals[3*vi1    ] = face_normals[3*ni1    ] // x
                normals[3*vi1 + 1] = face_normals[3*ni1 + 1] // y
                normals[3*vi1 + 2] = face_normals[3*ni1 + 2] // z

                normals[3*vi2    ] = face_normals[3*ni2    ] // x
                normals[3*vi2 + 1] = face_normals[3*ni2 + 1] // y
                normals[3*vi2 + 2] = face_normals[3*ni2 + 2] // z

                normals[3*vi3    ] = face_normals[3*ni3    ] // x
                normals[3*vi3 + 1] = face_normals[3*ni3 + 1] // y
                normals[3*vi3 + 2] = face_normals[3*ni3 + 2] // z
                
                if(clockwise){
                    indices.push(vi3)
                    indices.push(vi2)
                    indices.push(vi1)
                }else{
                    indices.push(vi1)
                    indices.push(vi2)
                    indices.push(vi3)
                }

                vertex_materials[vi1] = current_material
                vertex_materials[vi2] = current_material
                vertex_materials[vi3] = current_material

            }else if(words.length === 5){
                // QUAD

                let data1 = words[1].split("/")
                let data2 = words[2].split("/")
                let data3 = words[3].split("/")
                let data4 = words[4].split("/")

                let vi1 = parseInt(data1[0]) - 1
                let vi2 = parseInt(data2[0]) - 1
                let vi3 = parseInt(data3[0]) - 1
                let vi4 = parseInt(data4[0]) - 1

                let ti1 = parseInt(data1[1]) - 1
                let ti2 = parseInt(data2[1]) - 1
                let ti3 = parseInt(data3[1]) - 1
                let ti4 = parseInt(data4[1]) - 1

                let ni1 = parseInt(data1[2]) - 1
                let ni2 = parseInt(data2[2]) - 1
                let ni3 = parseInt(data3[2]) - 1
                let ni4 = parseInt(data4[2]) - 1

                if(data1.length < 2) { ni1 = vi1; console.log("Missing data in the obj.") }
                if(data2.length < 2) { ni2 = vi2; console.log("Missing data in the obj.") }
                if(data3.length < 2) { ni3 = vi3; console.log("Missing data in the obj.") }
                if(data4.length < 2) { ni4 = vi4; console.log("Missing data in the obj.") }
                
                if(data1.length < 1) { ti1 = vi1; console.log("Missing data in the obj.") }
                if(data2.length < 1) { ti2 = vi2; console.log("Missing data in the obj.") }
                if(data3.length < 1) { ti3 = vi3; console.log("Missing data in the obj.") }
                if(data4.length < 1) { ti4 = vi4; console.log("Missing data in the obj.") }

                // FIRST TRIS
                
                uvs[2*vi1    ] = face_uvs[2*ti1    ] // x
                uvs[2*vi1 + 1] = face_uvs[2*ti1 + 1] // y

                uvs[2*vi2    ] = face_uvs[2*ti2    ] // x
                uvs[2*vi2 + 1] = face_uvs[2*ti2 + 1] // y

                uvs[2*vi3    ] = face_uvs[2*ti3    ] // x
                uvs[2*vi3 + 1] = face_uvs[2*ti3 + 1] // y

                normals[3*vi1    ] = face_normals[3*ni1    ] // x
                normals[3*vi1 + 1] = face_normals[3*ni1 + 1] // y
                normals[3*vi1 + 2] = face_normals[3*ni1 + 2] // z

                normals[3*vi2    ] = face_normals[3*ni2    ] // x
                normals[3*vi2 + 1] = face_normals[3*ni2 + 1] // y
                normals[3*vi2 + 2] = face_normals[3*ni2 + 2] // z

                normals[3*vi3    ] = face_normals[3*ni3    ] // x
                normals[3*vi3 + 1] = face_normals[3*ni3 + 1] // y
                normals[3*vi3 + 2] = face_normals[3*ni3 + 2] // z
                
                if(clockwise){
                    indices.push(vi3)
                    indices.push(vi2)
                    indices.push(vi1)
                }else{
                    indices.push(vi1)
                    indices.push(vi2)
                    indices.push(vi3)
                }

                // SECOND TRIS

                uvs[2*vi4    ] = face_uvs[2*ti4    ] // x
                uvs[2*vi4 + 1] = face_uvs[2*ti4 + 1] // y

                normals[3*vi4    ] = face_normals[3*ni4    ] // x
                normals[3*vi4 + 1] = face_normals[3*ni4 + 1] // y
                normals[3*vi4 + 2] = face_normals[3*ni4 + 2] // z
                
                if(clockwise){
                    indices.push(vi4)
                    indices.push(vi3)
                    indices.push(vi1)
                }else{
                    indices.push(vi1)
                    indices.push(vi3)
                    indices.push(vi4)
                }

                vertex_materials[vi1] = current_material
                vertex_materials[vi2] = current_material
                vertex_materials[vi3] = current_material
                vertex_materials[vi4] = current_material

            }else{
                updateStatus("Only tris and quads(faces with 3 and 4 vertices) are supported.", "warn")
            }
        }else if(line.startsWith("# ")){
            console.log("> " + line)
        }
    });
    
    console.log("Vertices count: " + vertices.length)
    return {vertices, normals, uvs, indices, vertex_materials}
}

function openFile(){
    setPlay(false)
    readFile(async (text, name) => {
        if(name.endsWith(".obj")){
            let obj = importObj(text, false)

            clearUniformLocations()

            setVertices(obj.vertices)
            setUVs(obj.uvs)
            setNormals(obj.normals)
            setVertexMaterials(obj.vertex_materials)
            setIndices(obj.indices)
    
            let camera = getCamera()
            camera.shift = [0, 0, 3];
            setCamera(camera)
            document.getElementById("xRotSlider").value = 0

        }else if(name.endsWith(".mtl")){
            if(hasMesh()){
                let data = importMtl(text)
                setMaterials(data)
            }else{
                updateStatus("Error: import mesh before importing materials", "error")
            }
        }else if(name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png")){
            await uploadTexture(name.split(".")[0], text)
        }else{
            updateStatus("Error: file type not supported", "error")
        }
    })
}

module.exports = {
    openFile
}