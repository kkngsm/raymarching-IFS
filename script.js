window.onload = function(){
    //フルウィンドウにする
    const CANVAS_SIZE_X = window.innerWidth;
    const CANVAS_SIZE_Y = window.innerHeight;
    //マウス座標
    let mouseX = 0,mouseY = 0; omouseX = 0, omouseY = 0, mousePress = 0, wheel = 0;
    let fps = 1000 /30;

    // canvasエレメントを取得
    const c = document.getElementById('canvas');
    //キャンバスサイズを設定
    c.width = CANVAS_SIZE_X;
    c.height = CANVAS_SIZE_Y;
    //マウスがキャンバス上を動いているときマウス座標の取得
    c.addEventListener('mousemove', {width: c.width, height: c.height, handleEvent: mouseMove}, true);
    c.addEventListener('mousedown', function(){mousePress = 1}, true);
    c.addEventListener('mouseup', function(){mousePress = 0}, true);
    c.addEventListener('wheel', function(e){wheel -= e.deltaY; wheel = Math.min(Math.max(wheel, 0), 15)}, true);

    // webgl2コンテキストを取得
    gl = c.getContext('webgl2');

    //シェーダーのコンパイル等
    const v_shader = create_shader("vs");
    

    const buildingf_shader = create_shader("buildingfs");
    const buildingprg = create_program(v_shader, buildingf_shader);
    const buildingFrameBuffer = create_fbo(c.width, c.height);

    const passf_shader = create_shader("fsp");
    const passprg = create_program(v_shader, passf_shader);

    const vertices = new Float32Array([
        -1.0, 1.0,  0.0,      // xyz
        -1.0, -1.0, 0.0,
        1.0,  1.0,  0.0,
        1.0,  -1.0, 0.0
    ]);
    const vertexBuffer = create_vbo(vertices);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    setAttribuLocation(buildingprg, 'vPos', 3);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    const indices = new Uint16Array([
        0, 1, 2,
        1, 3, 2
    ]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const buildingprgUL = {
        resolution : gl.getUniformLocation(buildingprg, 'resolution'),
        omouse     : gl.getUniformLocation(buildingprg, 'omouse'),
        mouse      : gl.getUniformLocation(buildingprg, 'mouse'),
        mousePress : gl.getUniformLocation(buildingprg, 'mousePress'),
        wheel      : gl.getUniformLocation(buildingprg, 'wheel'),
        time       : gl.getUniformLocation(buildingprg, 'time'),
        Box_height : gl.getUniformLocation(buildingprg, '_Box_height'),
        Box_width  : gl.getUniformLocation(buildingprg, '_Box_width'),
        Box_space  : gl.getUniformLocation(buildingprg, '_Box_space'),
        Twist      : gl.getUniformLocation(buildingprg, '_Twist'),


    };
    const passprgUL = {
        buildingTex: gl.getUniformLocation(passprg, 'buildingTex'),
    };
    let start_time = Date.now(); 
    let now_time = 0;
    //レンダリング
    const guiParam = addGUI();
    (function(){
        now_time = (Date.now() - start_time)/1000;

        gl.bindFramebuffer(gl.FRAMEBUFFER, buildingFrameBuffer.f);
        gl.useProgram(buildingprg);
        //色をリセット
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(buildingprgUL['resolution'], c.width, c.height);
        gl.uniform2f(buildingprgUL['omouse'], omouseX, omouseY);
        gl.uniform2f(buildingprgUL['mouse'], mouseX, mouseY);
        gl.uniform1f(buildingprgUL['mousePress'], mousePress);
        gl.uniform1f(buildingprgUL['wheel'], wheel);
        gl.uniform1f(buildingprgUL['time'], now_time);
        gl.uniform1f(buildingprgUL['Box_width'], guiParam.Box_width);
        gl.uniform1f(buildingprgUL['Box_height'], guiParam.Box_height);
        gl.uniform1f(buildingprgUL['Box_space'], guiParam.Box_space);
        gl.uniform1f(buildingprgUL['Twist'], guiParam.Twist);

        gl.drawElements(gl.TRIANGLES, indices.length , gl.UNSIGNED_SHORT, 0);


        //頂点の描画 gpuの起動
        gl.drawElements(gl.TRIANGLES, indices.length , gl.UNSIGNED_SHORT, 0);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.useProgram(passprg);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        setUniformTexture(passprgUL['buildingTex'], 1, buildingFrameBuffer.t);
        gl.drawElements(gl.TRIANGLES, indices.length , gl.UNSIGNED_SHORT, 0);

        gl.flush();
        //再帰する
        setTimeout(arguments.callee, fps);
    })();
    //マウス座標取得関数
    function mouseMove(e){
        omouseX = mouseX; omouseY = mouseY;
        mouseX = e.offsetX/this.width;
        mouseY = -e.offsetY/this.height + 1;
    }
    //シェーダーのコンパイル関数
    function create_shader(id){
        // シェーダを格納する変数
        let shader;
        // HTMLからscriptタグへの参照を取得
        const scriptElement = document.getElementById(id);
        // scriptタグが存在しない場合は抜ける
        if(!scriptElement){return;}
        // scriptタグのtype属性をチェック
        switch(scriptElement.type){
            // 頂点シェーダだったら
            case 'vertex-shader':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
            // フラグメントシェーダだったら
            case 'fragment-shader':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return;
        }
        // 生成されたシェーダにソースを割り当てる
        gl.shaderSource(shader, scriptElement.text);
        // シェーダをコンパイル
        gl.compileShader(shader);
        // シェーダが正しくコンパイルできたか
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){ 
            // 成功していたらシェーダを返して終了
            return shader;
        }else{
            // エラーログをアラートする
            alert("id:"+ id +"\n" + gl.getShaderInfoLog(shader));
        }
    }

    function create_program(vs, fs){
        // プログラムオブジェクトの生成
        const program = gl.createProgram();
        // プログラムオブジェクトにシェーダを割り当てる
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        // シェーダをリンク
        gl.linkProgram(program);
        // シェーダのリンクが正しく行なわれたかチェック
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
            // プログラムオブジェクトを返して終了
            return program;
        }else{
            // 失敗していたらエラーログをアラートする
            alert(gl.getProgramInfoLog(program));
        }
    }

    //テクスチャの生成ヘルパー関数
    function create_texture(img) {
        const texture = gl.createTexture();
        // テクスチャをバインドする
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // テクスチャへイメージを適用
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        // ミップマップを生成
        gl.generateMipmap(gl.TEXTURE_2D);
        // テクスチャのバインドを無効化
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    //テクスチャをuniform変数に割り当てる
    function setUniformTexture(location, index, texture) {
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(location, index);
    }

    function create_screenTexture(width, height){
        // テクスチャオブジェクトの作成
        const texture = gl.createTexture();
        // テクスチャオブジェクトの関連付け
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // テクスチャオブジェクトの設定
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // テクスチャオブジェクトの関連付け解除
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }

    function create_fbo(width, height){
        // フレームバッファーオブジェクトの作成
        const frameBuffer = gl.createFramebuffer();
        // フレームバッファーオブジェクトの関連付け
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        // テクスチャオブジェクトの作成
        const frameTexture = create_screenTexture(width, height);
        // テクスチャオブジェクトの関連付け
        gl.bindTexture(gl.TEXTURE_2D, frameTexture);
        // フレームバッファーにテクスチャオブジェクトを入れる
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameTexture, 0);
        // どこに描画するか
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        //　関連付けの解除
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return {f: frameBuffer, t:frameTexture}
    }

    function create_vbo(data){
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    function setAttribuLocation(prg, name, size){
        const vAttribLocation = gl.getAttribLocation(prg, name);
        gl.enableVertexAttribArray(vAttribLocation);
        gl.vertexAttribPointer(vAttribLocation, size, gl.FLOAT, false, 0, 0);
    }
};
