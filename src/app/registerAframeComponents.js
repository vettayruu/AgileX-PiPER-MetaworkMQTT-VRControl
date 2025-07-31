let registered = false;

export default function registerAframeComponents(options) {
  if (registered) return;
  registered = true;

  const {
    set_rendered,
    robotChange,

    // Right Controller
    set_controller_object,
    set_trigger_on,
    set_grip_on,
    set_button_a_on,
    set_button_b_on,

    // Left Controller
    set_controller_object_left,
    set_trigger_on_left,
    set_grip_on_left,
    set_button_x_on,
    set_button_y_on,

    // Collision Check
    collision,
    setCollision,
    
    // Camera
    set_c_pos_x, set_c_pos_y, set_c_pos_z,
    set_c_deg_x, set_c_deg_y, set_c_deg_z,
    vrModeRef,
    props,
    onXRFrameMQTT,
  } = options;
  
  // set rendered state after a short delay to ensure the scene is ready
  setTimeout(() => set_rendered(true), 16.67); // ~60 FPS

  AFRAME.registerComponent('robot-click', {
    init: function () {
      this.el.addEventListener('click', () => {
        robotChange();
        console.log('robot-click');
      });
    }
  });

  AFRAME.registerComponent('vr-controller-right', {
    schema: { type: 'string', default: '' },
    init: function () {
      // Trigger 
      this.el.addEventListener('triggerdown', () => set_trigger_on(true));
      this.el.addEventListener('triggerup', () => set_trigger_on(false));

      // Gripper
      this.el.addEventListener('gripdown', () => set_grip_on(true));
      this.el.addEventListener('gripup', () => set_grip_on(false));

      // A/B
      this.el.addEventListener('abuttondown', () => set_button_a_on(true));
      this.el.addEventListener('abuttonup', () => set_button_a_on(false));
      this.el.addEventListener('bbuttondown', () => set_button_b_on(true));
      this.el.addEventListener('bbuttonup', () => set_button_b_on(false));

    },
    tick: function () {
      set_controller_object(this.el.object3D);
    }
  });

    AFRAME.registerComponent('vr-controller-left', {
    schema: { type: 'string', default: '' },
    init: function () {
      // Trigger 
      this.el.addEventListener('triggerdown', () => set_trigger_on_left(true));
      this.el.addEventListener('triggerup', () => set_trigger_on_left(false));

      // Gripper
      this.el.addEventListener('gripdown', () => set_grip_on_left(true));
      this.el.addEventListener('gripup', () => set_grip_on_left(false));

      // X/Y
      this.el.addEventListener('xbuttondown', () => set_button_x_on(true));
      this.el.addEventListener('xbuttonup', () => set_button_x_on(false));
      this.el.addEventListener('ybuttondown', () => set_button_y_on(true));
      this.el.addEventListener('ybuttonup', () => set_button_y_on(false));

    },
    tick: function () {
      set_controller_object_left(this.el.object3D);
    }
  });

  AFRAME.registerComponent('jtext', {
    schema: {
      text: { type: 'string', default: '' },
      width: { type: 'number', default: 1 },
      height: { type: 'number', default: 0.12 },
      color: { type: 'string', default: 'black' },
      background: { type: 'string', default: 'white' },
      border: { type: 'string', default: 'black' }
    },
    init: function () {
      const el = this.el;
      const data = this.data;
      const bg = document.createElement('a-plane');
      bg.setAttribute('width', data.width);
      bg.setAttribute('height', data.height);
      bg.setAttribute('color', data.background);
      bg.setAttribute('position', '0 0 0.01');
      bg.setAttribute('opacity', '0.8');
      const text = document.createElement('a-entity');
      text.setAttribute('troika-text', {
        value: data.text,
        align: 'center',
        color: data.color,
        fontSize: 0.05,
        maxWidth: data.width * 0.9,
        font: "BIZUDPGothic-Bold.ttf",
      });
      text.setAttribute('position', '0 0 0.01');
      this.text = text;
      el.appendChild(bg);
      el.appendChild(text);
    },
    update: function (oldData) {
      const data = this.data;
      this.text.setAttribute('troika-text', {
        value: data.text,
        align: 'center',
        color: data.color,
        fontSize: 0.05,
        maxWidth: data.width * 0.95,
        font: "BIZUDPGothic-Bold.ttf",
      });
      this.text.setAttribute('position', '0 0 0.01');
    }
  });

  // Start animation in VR scene
  AFRAME.registerComponent('scene', {
    init: function () {
      this.el.addEventListener('enter-vr', () => {
        vrModeRef.current = true;
        console.log('enter-vr');
        if (!props.viewer) {
          let xrSession = this.el.renderer.xr.getSession();
          xrSession.requestAnimationFrame(onXRFrameMQTT);
        }
        set_c_pos_x(0);
        set_c_pos_y(-0.6);
        set_c_pos_z(0.90);
        set_c_deg_x(0);
        set_c_deg_y(0);
        set_c_deg_z(0);
      });
      this.el.addEventListener('exit-vr', () => {
        vrModeRef.current = false;
        console.log('exit-vr');
      });
    }
  });

  AFRAME.registerComponent('model-opacity', {
    schema: {
      opacity: { type: 'number', default: 0.5 },
    },
    init: function () {
      this.el.addEventListener('model-loaded', this.update.bind(this));
    },
    update: function () {
      var mesh = this.el.getObject3D('mesh');
      var data = this.data;
      if (!mesh) {
        return;
      }
      mesh.traverse(function (node) {
        if (node.isMesh) {
          node.material.opacity = data.opacity;
          node.material.transparent = data.opacity < 1.0;
          node.material.needsUpdate = true;
        }
      });
    },
  });

  // AFRAME.registerComponent('joint-collision-check', {
  //   schema: {
  //     target: { type: 'selector' } 
  //   },
  //   tick: function () {
  //     const meshA = this.el.getObject3D('mesh');
  //     const meshB = this.data.target?.getObject3D('mesh');
  //     if (!meshA || !meshB) return;

  //     meshA.updateMatrixWorld();
  //     meshB.updateMatrixWorld();

  //     const boxA = new THREE.Box3().setFromObject(meshA).expandByScalar(0.06);
  //     const boxB = new THREE.Box3().setFromObject(meshB).expandByScalar(0.06);

  //     if (boxA.intersectsBox(boxB)) {
  //       this.el.setAttribute('material', 'color', 'red'); 
  //       setCollision(true);
  //       console.warn(`🚨 Collision：${this.el.id} and ${this.data.target.id}`);
  //     } else {
  //       this.el.setAttribute('material', 'color', 'white');
  //       setCollision(false);
  //     }
  //   }
  // });

  AFRAME.registerComponent('joint-collision-check', {
    schema: {
      target: { type: 'selector' },
      xPad: { type: 'number', default: 0 },
      yPad: { type: 'number', default: 0 },
      zPad: { type: 'number', default: 0 }
    },

    tick: function () {
      const meshA = this.el.getObject3D('mesh');
      const meshB = this.data.target?.getObject3D('mesh');
      if (!meshA || !meshB) return;

      meshA.updateMatrixWorld();
      meshB.updateMatrixWorld();

      const padding = new THREE.Vector3(this.data.xPad, this.data.yPad, this.data.zPad);

      const boxA = new THREE.Box3().setFromObject(meshA).expandByVector(padding);
      const boxB = new THREE.Box3().setFromObject(meshB).expandByVector(padding);

      if (boxA.intersectsBox(boxB)) {
        setCollision(true);
        console.warn(`🚨 Collision：${this.el.id} and ${this.data.target.id}`);
      } else {
        setCollision(false);
      }
    }
  });

  AFRAME.registerComponent('show-collision-box', {
    schema: {
      xPad: { type: 'number', default: 0 },
      yPad: { type: 'number', default: 0 },
      zPad: { type: 'number', default: 0 },
      color: { type: 'color', default: '#00ff00' },
      opacity: { type: 'number', default: 0.5 } 
    },

    init: function () {
      this.helper = null;

      this.el.addEventListener('model-loaded', () => {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) return;

        mesh.updateMatrixWorld(true);
        const padding = new THREE.Vector3(this.data.xPad, this.data.yPad, this.data.zPad);
        const box = new THREE.Box3().setFromObject(mesh).expandByVector(padding);

        this.helper = new THREE.Box3Helper(box, new THREE.Color(this.data.color));
        this.helper.material.transparent = true;
        this.helper.material.opacity = this.data.opacity;

        this.el.sceneEl.object3D.add(this.helper);
      });
    },

    tick: function () {
      if (!this.helper) return;
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      mesh.updateMatrixWorld(true);
      const padding = new THREE.Vector3(this.data.xPad, this.data.yPad, this.data.zPad);
      const box = new THREE.Box3().setFromObject(mesh).expandByVector(padding);

      this.helper.box.copy(box);
    }
  });


  // AFRAME.registerComponent('joint-collision-check', {
  //   schema: {
  //     targets: { type: 'selectorAll' } // 可以选多个目标
  //   },
  //   tick: function () {
  //     const meshA = this.el.getObject3D('mesh');
  //     if (!meshA) return;

  //     meshA.updateMatrixWorld();
  //     const boxA = new THREE.Box3().setFromObject(meshA);

  //     this.data.targets.forEach(target => {
  //       const meshB = target.getObject3D('mesh');
  //       if (!meshB) return;
  //       meshB.updateMatrixWorld();
  //       const boxB = new THREE.Box3().setFromObject(meshB);

  //       if (boxA.intersectsBox(boxB)) {
  //         meshA.traverse(n => n.isMesh && n.material?.color.set('red'));
  //         console.warn(`碰撞：${this.el.id} ←→ ${target.id}`);
  //       }
  //     });
  //   }
  // });


}