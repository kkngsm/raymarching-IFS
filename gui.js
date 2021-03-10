function addGUI(){
    // GUIパラメータ
        this.Box_width = 0.001;
    let guiCtrl = function(){
        this.Box_width = 0.1;
        this.Box_height = 2.;
        this.Box_space = 0.06;
        this.Twist = 4.2;
    };

    gui = new dat.GUI();
    guiObj = new guiCtrl();
    const building = gui.addFolder('building');
    building.add(guiObj, 'Box_width', 0.001, 0.499);
    building.add(guiObj, 'Box_height', 0.001, 1.999);
    building.add(guiObj, 'Box_space', 0.001, 0.999);
    building.add(guiObj, 'Twist', 0.001, 4.999);

    gui.open();
    
    return guiObj;
}