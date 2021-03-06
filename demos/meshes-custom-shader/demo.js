var browser = null;
var map = null;
var renderer = null;
var woodTexture = null;
var cubeMesh = null;
var cubeShader = null;
var cubeState = null;
var animationTime = 0;
var timeStart = 0;

(function startDemo() {
    // create map in the html div with id 'map-div'
    // parameter 'map' sets path to the map which will be displayed
    // you can create your own map on melown.com
    // position parameter is described in documentation 
    // https://github.com/Melown/vts-browser-js/wiki/VTS-Browser-Map-API#position
    // view parameter is described in documentation 
    // https://github.com/Melown/vts-browser-js/wiki/VTS-Browser-Map-API#definition-of-view
    browser = vts.browser('map-div', {
        map: 'https://cdn.melown.com/mario/store/melown2015/map-config/melown/VTS-Tutorial-map/mapConfig.json',
        position : [ 'obj', 15.401540091152043, 50.660724358366906, 'float', 0.00, -244.63, -28.56, 0.00, 175.37, 45.00 ]
    });

    //check whether browser is supported
    if (!browser) {
        console.log('Your web browser does not support WebGL');
        return;
    }

    renderer = browser.renderer;

    //callback once is map config loaded
    browser.on('map-loaded', onMapLoaded);
    browser.on('tick', onTick);

    //load texture used for cubes    
    loadTexture();

    //create cube mesh        
    createCube();    
})();


function loadTexture() {
    //load texture used for cubes    
    var woodImage = vts.utils.loadImage('https://i.imgur.com/vVtw6pA.png',
        (function(){
            woodTexture = renderer.createTexture({ source: woodImage });
        }).bind(this)
        );
}


function createCube() {

    var vertices = [ 1,1,1, -1,1,1, -1,-1,1, //top 
                     -1,-1,1, 1,-1,1, 1,1,1,

                     -1,1,-1, 1,1,-1, 1,-1,-1, //bottom 
                     1,-1,-1, -1,-1,-1, -1,1,-1,
                     
                     1,-1,1, -1,-1,1, -1,-1,-1, //front 
                     -1,-1,-1, 1,-1,-1, 1,-1,1,
                     
                     -1,1,1, 1,1,1, 1,1,-1, //back 
                     1,1,-1, -1,1,-1, -1,1,1,

                     -1,-1,1, -1,1,1, -1,1,-1, //left 
                     -1,1,-1, -1,-1,-1, -1,-1,1,

                     1,1,1, 1,-1,1, 1,-1,-1, //right 
                     1,-1,-1, 1,1,-1, 1,1,1 ];
                      
    var uvs = [ 0,0, 1,0, 1,1, //top
                1,1, 0,1, 0,0,

                0,0, 1,0, 1,1, //bottom
                1,1, 0,1, 0,0,                
                
                0,0, 1,0, 1,1, //front
                1,1, 0,1, 0,0,                

                0,0, 1,0, 1,1, //back
                1,1, 0,1, 0,0,                

                0,0, 1,0, 1,1, //left
                1,1, 0,1, 0,0,

                0,0, 1,0, 1,1, //right
                1,1, 0,1, 0,0 ];

    var normals = [ 0,0,1, 0,0,1, 0,0,1, //top
                    0,0,1, 0,0,1, 0,0,1,

                    0,0,-1, 0,0,-1, 0,0,-1, //bottom
                    0,0,-1, 0,0,-1, 0,0,-1,                    

                    0,-1,0, 0,-1,0, 0,-1,0, //front
                    0,-1,0, 0,-1,0, 0,-1,0,                    
                    
                    0,1,0, 0,1,0, 0,1,0, //back
                    0,1,0, 0,1,0, 0,1,0,                    

                    -1,0,0, -1,0,0, -1,0,0, //left
                    -1,0,0, -1,0,0, -1,0,0,                    

                    1,0,0, 1,0,0, 1,0,0, //right
                    1,0,0, 1,0,0, 1,0,0 ];

    cubeMesh = renderer.createMesh({ vertices: vertices, uvs: uvs, normals: normals });

    cubeState = renderer.createState({
                    blend : false,
                    stencil : false,
                    zoffset : 0,
                    zwrite : true,
                    ztest : true,  //  z buffer test - less
                    zequal : true, //  switch z buffer test from less to less or equal
                    culling : true });

    cubeShader = renderer.createShader({
    
        'vertexShader' : 'attribute vec3 aPosition;\n'+
                         'attribute vec2 aTexCoord;\n'+
                         'attribute vec3 aNormal;\n'+
                         'uniform mat4 uMV, uProj;\n'+
                         'uniform mat3 uNorm;\n'+
                         'uniform float uFogDensity;\n'+
                         'varying vec2 vTexCoord;\n'+
                         'varying vec4 vPosition;\n'+
                         'varying vec3 vNormal;\n'+
                         'varying float vFogFactor;\n'+
                         'void main() {\n'+
                             //compute camera space position and prejected position
                             'vec4 camSpacePos = uMV * vec4(aPosition, 1.0);\n'+
                             'gl_Position = uProj * camSpacePos;\n'+

                             //compute fog density
                             'float camDist = length(camSpacePos.xyz);\n'+
                             'vFogFactor = exp(uFogDensity * camDist);\n'+

                             //pass UVs, Positions and Normals to fragment shader
                             'vTexCoord = aTexCoord;\n'+
                             'vPosition = camSpacePos;\n'+
                             'vNormal = aNormal * uNorm;\n'+
                         '}',

        'fragmentShader' : 

                         'precision mediump float;\n'+

                         'varying vec2 vTexCoord;\n'+
                         'varying vec4 vPosition;\n'+
                         'varying vec3 vNormal;\n'+
                         'varying float vFogFactor;\n'+

                         'uniform sampler2D uSampler;\n'+
                         'uniform mat4 uMaterial;\n'+
                         'uniform float uTime;\n'+
                         'uniform vec4 uFogColor;\n'+

                         'void main() {\n'+
                             //compute light color
                             'vec3 ldir = normalize(-vPosition.xyz);\n'+
                             'vec3 normal = normalize(vNormal);\n'+
                             'vec3 eyeDir = ldir;\n'+
                             'vec3 refDir = reflect(-ldir, normal);\n'+
                             'float specW = min(1.0, pow(max(dot(refDir, eyeDir), 0.0), uMaterial[3][0]));\n'+
                             'float diffW = min(1.0, max(dot(normal, ldir), 0.0));\n'+
                             'vec4 lcolor = uMaterial[0]+(uMaterial[1]*diffW)+(uMaterial[2]*specW);\n'+
                             
                             //texture color
                             'vec4 tcolor = texture2D(uSampler, vTexCoord);\n'+

                             //sine animation
                             'tcolor.rgb = mix(vec3(1.0,1.0,1.0), tcolor.rgb, abs(vTexCoord.y-0.5+sin(vTexCoord.x*3.14*2.0-uTime)*0.25)*2.0);\n'+

                             //apply fog
                             'gl_FragColor = mix(uFogColor, vec4(lcolor.xyz*(1.0/255.0), 1.0) * tcolor, vFogFactor); gl_FragColor.z *= uMaterial[3][1];\n'+
                          '}'
    
    });

}


function drawCube(coords, scale, ambientColor, diffuseColor, specularColor, shininess, textured) {

    //get camera transformations matrices
    var cameraInfo = map.getCameraInfo();

    //get local space matrix
    //this matrix makes mesh
    //perpendiculal to the ground
    //and oriteted to the north
    var spaceMatrix = map.getNED(coords);

    //move cube above terain
    coords[2] += scale * 2;

    //we have coords in navigation coodinates,
    //so we need to convert them to camera space.
    //you can imagine camera space as physical space
    //but reative to the camera coordinates
    coords = map.convertCoordsFromNavToCameraSpace(coords, 'float');

    // translate matrix
    var translateMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        coords[0], coords[1], coords[2], 1
    ];

    // scale matrix
    var scaleMatrix = [
        scale, 0, 0, 0,
        0, scale, 0, 0,
        0, 0, scale, 0,
        0, 0, 0, 1
    ];

    //combine scale, space and translate matrices
    var mv = vts.mat4.create();
    vts.mat4.multiply(spaceMatrix, scaleMatrix, mv);
    vts.mat4.multiply(translateMatrix, mv, mv);

    //multiply cube matrix with camera view matrix
    vts.mat4.multiply(cameraInfo.viewMatrix, mv, mv);

    var norm = [
        0,0,0,
        0,0,0,
        0,0,0
    ];

    //extract normal transformation matrix from model view matrix
    //this matrix is needed for corret lighting
    vts.mat4.toInverseMat3(mv, norm);

    //setup material 
    var material = [
        ambientColor[0], ambientColor[1], ambientColor[2], 0,
        diffuseColor[0], diffuseColor[1], diffuseColor[2], 0,
        specularColor[0], specularColor[1], specularColor[2], 0,
        shininess, 1, 0, 0
    ];

    renderer.setState(cubeState);

    //draw cube
    renderer.drawMesh({
            mesh : cubeMesh,
            texture : woodTexture,
            shader : cubeShader,
            shaderVariables : {
                'uProj' : ['mat4', cameraInfo.projectionMatrix],
                'uMV' : ['mat4', mv],
                'uNorm' : ['mat3', norm],
                'uMaterial' : ['mat4', material],
                'uTime' : ['float', animationTime]
            }
        });
}


function onMapLoaded() {
    //add render slots
    //render slots are called during map render
    map = browser.map;    
    map.addRenderSlot('custom-meshes', onDrawMeshes, true);
    map.moveRenderSlotAfter('after-map-render', 'custom-meshes');
    timeStart = Date.now();
};


function onDrawMeshes(renderChannel) {
    if (renderChannel != 'base') {
        return; //draw only in base channel
    }

    if (woodTexture) { //check whether texture is loded
        //draw textured cube        
        drawCube([15.401273646044713, 50.66085886059055, 3], 10, [0,0,0], [255,255,255], [255,255,255], 90, true);
    }    
} 

function onTick() {
    if (map && woodTexture) { //check whether texture is loded

        animationTime = (Date.now() - timeStart) * 0.002;

        map.redraw();
    }
}

