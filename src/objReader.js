import { updateStatus } from "./utilities.js"
import { 
    setPlay, setVertices, setNormals, 
    setIndices, setVertexMaterials, clearUniformLocations, 
    setTimeZero, setLastFPS, getCamera, setCamera, getPlay,
    startLoop, hasMesh, setMaterials
} from "./engine.js"

function readFile(useText){
    let file = document.getElementById("objInput").files[0]
    var reader = new FileReader();

    updateStatus("Importing '" + file.name + "'");

	// file reading started
	reader.addEventListener('loadstart', function() {
	    document.querySelector("#objInput").style.display = 'none'; 
	});

	// file reading finished successfully
	reader.addEventListener('load', function(e) {
        var text = e.target.result;
        
        useText(text, file.name);

        document.querySelector("#objInput").style.display = 'block'; 

        return text;
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

	// read as text file
    updateStatus("Importing progress: 0%");

    if(file.name.endsWith(".hdr")){   
        console.log("Reading binary file.")
        reader.readAsBinaryString(file);

    }else{
        reader.readAsText(file);
    }
}

function importMtl(text){
    let materials = {}
    let n = 0

    let baseColorArray = []
    let specularityArray = []
    let metallicArray = [] // 1=dielettric 2=metallic

    let lines = text.split(/\r?\n/);
    lines.forEach(line => {
        if(line.startsWith("newmtl ")){
            let words = line.split(/\s+/)
            materials[words[1]] = ++n

            baseColorArray.push(1, 1, 1)
            specularityArray.push(1)
            metallicArray.push(1)

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
        }
    })

    return {materials, baseColorArray, specularityArray, metallicArray}
}

function importObj(text, clockwise = false){
    let vertices = []
    let face_normals = []
    let uvs = []

    let vertex_materials = []
    let normals = []
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

                let ni1 = parseInt(data1[2]) - 1
                let ni2 = parseInt(data2[2]) - 1
                let ni3 = parseInt(data3[2]) - 1

                if(data1.length < 2) ni1 = vi1
                if(data2.length < 2) ni2 = vi2
                if(data3.length < 2) ni3 = vi3

                normals[3*vi1    ] += face_normals[3*ni1    ] // x
                normals[3*vi1 + 1] += face_normals[3*ni1 + 1] // y
                normals[3*vi1 + 2] += face_normals[3*ni1 + 2] // z

                normals[3*vi2    ] += face_normals[3*ni2    ] // x
                normals[3*vi2 + 1] += face_normals[3*ni2 + 1] // y
                normals[3*vi2 + 2] += face_normals[3*ni2 + 2] // z

                normals[3*vi3    ] += face_normals[3*ni3    ] // x
                normals[3*vi3 + 1] += face_normals[3*ni3 + 1] // y
                normals[3*vi3 + 2] += face_normals[3*ni3 + 2] // z
                
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

                let ni1 = parseInt(data1[2]) - 1
                let ni2 = parseInt(data2[2]) - 1
                let ni3 = parseInt(data3[2]) - 1
                let ni4 = parseInt(data4[2]) - 1

                if(data1.length < 2) ni1 = vi1
                if(data2.length < 2) ni2 = vi2
                if(data3.length < 2) ni3 = vi3
                if(data4.length < 2) ni4 = vi4

                // FIRST TRIS

                normals[3*vi1    ] += face_normals[3*ni1    ] // x
                normals[3*vi1 + 1] += face_normals[3*ni1 + 1] // y
                normals[3*vi1 + 2] += face_normals[3*ni1 + 2] // z

                normals[3*vi2    ] += face_normals[3*ni2    ] // x
                normals[3*vi2 + 1] += face_normals[3*ni2 + 1] // y
                normals[3*vi2 + 2] += face_normals[3*ni2 + 2] // z

                normals[3*vi3    ] += face_normals[3*ni3    ] // x
                normals[3*vi3 + 1] += face_normals[3*ni3 + 1] // y
                normals[3*vi3 + 2] += face_normals[3*ni3 + 2] // z
                
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

                normals[3*vi1    ] += face_normals[3*ni1    ] // x
                normals[3*vi1 + 1] += face_normals[3*ni1 + 1] // y
                normals[3*vi1 + 2] += face_normals[3*ni1 + 2] // z

                normals[3*vi3    ] += face_normals[3*ni3    ] // x
                normals[3*vi3 + 1] += face_normals[3*ni3 + 1] // y
                normals[3*vi3 + 2] += face_normals[3*ni3 + 2] // z

                normals[3*vi4    ] += face_normals[3*ni4    ] // x
                normals[3*vi4 + 1] += face_normals[3*ni4 + 1] // y
                normals[3*vi4 + 2] += face_normals[3*ni4 + 2] // z
                
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
    readFile((text, name) => {
        if(name.endsWith(".obj")){
            let obj = importObj(text, false)

            clearUniformLocations()

            setVertices(obj.vertices)
            setNormals(obj.normals)
            setVertexMaterials(obj.vertex_materials)
            setIndices(obj.indices)
    
            setTimeZero(new Date())
            setLastFPS(0)
    
            let camera = getCamera()
            camera.shift = [0, 0, 3];
            setCamera(camera)

            // modelRot = [0, 0, 0]
            document.getElementById("xRotSlider").value = 0
    
            if(!getPlay()) startLoop()

        }else if(name.endsWith(".mtl")){
            if(hasMesh()){
                let data = importMtl(text)
                setMaterials(data.materials)

                if(!getPlay()) {
                    startLoop(data.baseColorArray, data.specularityArray, data.metallicArray)
                }
            }else{
                updateStatus("Error: import mesh before importing materials", "error")
            }
        }else if(name.endsWith(".hdr")){
            console.log(text)
        }else{
            updateStatus("Error: file type not supported", "error")
        }
    })
}

module.exports = {
    openFile
}