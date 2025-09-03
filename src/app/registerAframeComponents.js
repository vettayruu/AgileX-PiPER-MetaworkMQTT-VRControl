

import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

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
    setThumbstickRight,
    setThumbstickDownRight,

    // Left Controller
    set_controller_object_left,
    set_trigger_on_left,
    set_grip_on_left,
    set_button_x_on,
    set_button_y_on,
    setThumbstickLeft,
    setThumbstickDownLeft,
    setShowMenu,

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
  setTimeout(() => set_rendered(true), 16.67); // ~ 60 FPS

  /* ========================== Robot Model Component ========================= */
  AFRAME.registerComponent('robot-click', {
    init: function () {
      this.el.addEventListener('click', () => {
        robotChange();
        console.log('robot-click');
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


  /* ========================== VR Controller Component ========================= */
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

      this.el.addEventListener('thumbstickdown', () => setThumbstickDownRight(true));
      this.el.addEventListener('thumbstickmoved', (event) => {
        const { x, y } = event.detail; 
        setThumbstickRight([x, y]);
      });

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

      this.el.addEventListener('thumbstickdown', () => setThumbstickDownLeft(true));
      this.el.addEventListener('thumbstickmoved', (event) => {
      const { x, y } = event.detail; 
      setThumbstickLeft([x, y]);
      });

      this.el.addEventListener('menubuttondown', () => setShowMenu(v => !v));

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


  /* ========================== Collision Check Component ========================= */
  AFRAME.registerComponent('joint-collision-check', {
    schema: {
      target: { type: 'selector' },
      xPad: { type: 'number', default: 0 },
      yPad: { type: 'number', default: 0 },
      zPad: { type: 'number', default: 0 }
    },

    init: function () {
      if (!this.data.target) {
        console.error('Target not specified or invalid for joint-collision-check component');
        return;
      }

      this.targetEl = this.data.target;
      if (!this.targetEl) {
        console.error(`Target entity not found: ${this.data.target}`);
        return;
      }
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
  

  AFRAME.registerComponent('follow-camera', {
    schema: {
      offset: { type: 'vec3', default: { x: 0, y: 0, z: -1 } } // Offset relative to the camera
    },
    tick: function () {
      const cameraEl = this.el.sceneEl.camera.el; // Get the camera entity
      if (!cameraEl) return;

      // Get the camera's world position and rotation
      const cameraWorldPosition = new THREE.Vector3();
      const cameraWorldRotation = new THREE.Euler();
      cameraEl.object3D.getWorldPosition(cameraWorldPosition);
      cameraEl.object3D.getWorldRotation(cameraWorldRotation);

      // Apply the offset relative to the camera's position
      const offset = new THREE.Vector3(this.data.offset.x, this.data.offset.y, this.data.offset.z);
      offset.applyEuler(cameraWorldRotation); // Rotate the offset based on the camera's rotation
      const newPosition = cameraWorldPosition.add(offset);

      // Update the position and rotation of the entity
      this.el.object3D.position.copy(newPosition);
      this.el.object3D.rotation.copy(cameraWorldRotation);
    }
  });


  // AFRAME.registerComponent('multi-collision-check', {
  //   schema: {
  //     targets: { type: 'selectorAll' } // 
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
  //         console.warn(`Collision：${this.el.id} ←→ ${target.id}`);
  //       }
  //     });
  //   }
  // });

  /* ========================== Stereo Image Component ========================= */
  AFRAME.registerComponent('stereo-plane', {
    schema: {
      eye: { type: 'string', default: 'left' }, // 'left', 'right', or 'both'
      videoId: { type: 'string', default: '' }  // ID of the <video> element
    },
    init() {
      const videoEl = document.getElementById(this.data.videoId);
      if (!videoEl || videoEl.tagName !== 'VIDEO') {
        console.warn('Video element not found or invalid:', this.data.videoId);
        return;
      }

      this.videoEl = videoEl;
      this.videoEl.setAttribute('crossorigin', 'anonymous');
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.play();

      this.el.setAttribute('material', {
        shader: 'flat',
        src: this.videoEl
      });

      this.el.setAttribute('geometry', {
        primitive: 'plane',
        // width: 2.5,
        // height: 2
      });

      // this.el.setAttribute('position', '0 1.0 0.5');
    },
    update() {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      switch (this.data.eye) {
        case 'left':
          mesh.layers.set(1);
          break;
        case 'right':
          mesh.layers.set(2);
          break;
        default:
          mesh.layers.set(0); // both
      }
    }
  });

  AFRAME.registerComponent('stereo-curvedvideo', {
    schema: {
      eye: { type: 'string', default: 'left' }, // left / right / both
      videoId: { type: 'string' }
    },
    init: function () {
      const videoEl = document.getElementById(this.data.videoId);
      if (!videoEl || videoEl.tagName !== 'VIDEO') {
        console.warn('Video element not found:', this.data.videoId);
        return;
      }

      this.videoEl = videoEl;
      this.videoEl.setAttribute('crossorigin', 'anonymous');
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.play();

      this.el.addEventListener('model-loaded', () => {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) return;

        mesh.traverse((node) => {
          if (node.isMesh) {
            node.material = new THREE.MeshBasicMaterial({
              map: new THREE.VideoTexture(this.videoEl),
              side: THREE.DoubleSide
            });
          }
        });
      });

      const mesh = this.el.getObject3D('mesh');
      if (mesh) {
        mesh.traverse((node) => {
          if (node.isMesh) {
            node.material = new THREE.MeshBasicMaterial({
              map: new THREE.VideoTexture(this.videoEl),
              side: THREE.DoubleSide
            });
          }
        });
      }
    },
    update: function () {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      switch (this.data.eye) {
        case 'left':
          mesh.layers.set(1);
          break;
        case 'right':
          mesh.layers.set(2);
          break;
        default:
          mesh.layers.set(0);
      }
    }
  });

  AFRAME.registerComponent('stereo-spherevideo', {
    schema: {
      eye: { type: 'string', default: 'left' }, // 'left', 'right', or 'both'
      videoId: { type: 'string', default: '' }  // ID of the <video> element
    },
    init: function () {
      const videoEl = document.getElementById(this.data.videoId);
      if (!videoEl || videoEl.tagName !== 'VIDEO') {
        console.warn('Video element not found:', this.data.videoId);
        return;
      }

      this.videoEl = videoEl;
      this.videoEl.setAttribute('crossorigin', 'anonymous');
      this.videoEl.setAttribute('playsinline', 'true');
      this.videoEl.play();

      // 设置半球几何体
      this.el.setAttribute('geometry', {
        primitive: 'sphere',
        radius: 50, 
        segmentsWidth: 64,
        segmentsHeight: 32,
        thetaStart: 45, 
        thetaLength: 75,
        phiStart: 185,
        phiLength: 145
      });

      // 19 * Math.PI / 36 95, 17 * Math.PI / 18, 0, Math.PI

      // 设置材质为视频纹理
      this.el.setAttribute('material', {
        shader: 'flat',
        src: new THREE.VideoTexture(this.videoEl),
        side: 'double' // 双面材质
      });

      // 设置初始位置
      // this.el.setAttribute('position', this.data.eye === 'left' ? '-1.5 1.5 -2' : '1.5 1.5 -2');
    },
    update: function () {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      switch (this.data.eye) {
        case 'left':
          mesh.layers.set(1);
          break;
        case 'right':
          mesh.layers.set(2);
          break;
        default:
          mesh.layers.set(0); // both
      }
    }
  });


  /* Menu */
  AFRAME.registerComponent('highlight', {
    init: function () {
      var buttonEls = this.buttonEls = this.el.querySelectorAll('.menu-button');
      var backgroundEl = document.querySelector('#background');
      this.onClick = this.onClick.bind(this);
      this.onMouseEnter = this.onMouseEnter.bind(this);
      this.onMouseLeave = this.onMouseLeave.bind(this);
      this.reset = this.reset.bind(this);
      backgroundEl.addEventListener('click', this.reset);
      for (var i = 0; i < buttonEls.length; ++i) {
        buttonEls[i].addEventListener('mouseenter', this.onMouseEnter);
        buttonEls[i].addEventListener('mouseleave', this.onMouseLeave);
        buttonEls[i].addEventListener('click', this.onClick);
      }
    },

    onClick: function (evt) {
      evt.target.pause();
      evt.target.setAttribute('material', 'color', '#046de7');
      this.el.addState('clicked');
      evt.target.object3D.scale.set(1.2, 1.2, 1.2);
    },

    onMouseEnter: function (evt) {
      var buttonEls = this.buttonEls;
      evt.target.setAttribute('material', 'color', '#046de7');
      for (var i = 0; i < buttonEls.length; ++i) {
        if (evt.target === buttonEls[i]) { continue; }
        buttonEls[i].setAttribute('material', 'color', 'white');
      }
    },

    onMouseLeave: function (evt) {
      if (this.el.is('clicked')) { return; }
      evt.target.setAttribute('material', 'color', 'white');
    },

    reset: function () {
      var buttonEls = this.buttonEls;
      for (var i = 0; i < buttonEls.length; ++i) {
        this.el.removeState('clicked');
        buttonEls[i].play();
        buttonEls[i].emit('mouseleave');
      }
    }
  });

  /* global AFRAME */
  AFRAME.registerComponent('info-panel', {
    init: function () {
      var buttonEls = document.querySelectorAll('.menu-button');
      var fadeBackgroundEl = this.fadeBackgroundEl = document.querySelector('#fadeBackground');

      this.movieTitleEl = document.querySelector('#movieTitle');
      this.movieDescriptionEl = document.querySelector('#movieDescription');

      this.movieInfo = {
        karigurashiButton: {
          title: 'The Secret World of Arrietty (2010)',
          imgEl: document.querySelector('#karigurashiMovieImage'),
          description: 'Based on the 1952 novel The Borrowers by Mary Norton, an English author of children\'s books, about a family of tiny people who live secretly in the walls and floors of a typical household, borrowing items from humans to survive.'
        },
        kazetachinuButton: {
          title: 'The Wind Rises (2013)',
          imgEl: document.querySelector('#kazetachinuMovieImage'),
          description: 'The Wind Rises is a fictionalised biographical film of Jiro Horikoshi (1903, 1982), designer of the Mitsubishi A5M fighter aircraft and its successor, the Mitsubishi A6M Zero, used by the Empire of Japan during World War II. The film is adapted from Miyazaki\'s manga of the same name, which was in turn loosely based on both the 1937 novel The Wind Has Risen by Tatsuo Hori and the life of Jiro Horikoshi.'
        },
        ponyoButton: {
          title: 'Ponyo (2003)',
          imgEl: document.querySelector('#ponyoMovieImage'),
          description: 'It is the eighth film Miyazaki directed for Studio Ghibli, and his tenth overall. The film tells the story of Ponyo (Nara), a goldfish who escapes from the ocean and is rescued by a five-year-old human boy, Sōsuke (Doi) after she is washed ashore while trapped in a glass jar.'
        }
      };

      this.onMenuButtonClick = this.onMenuButtonClick.bind(this);
      this.onBackgroundClick = this.onBackgroundClick.bind(this);
      this.backgroundEl = document.querySelector('#background');
      for (var i = 0; i < buttonEls.length; ++i) {
        buttonEls[i].addEventListener('click', this.onMenuButtonClick);
      }
      this.backgroundEl.addEventListener('click', this.onBackgroundClick);
      this.el.object3D.renderOrder = 2;
      this.el.object3D.depthTest = false;
      fadeBackgroundEl.object3D.renderOrder = 1;
      fadeBackgroundEl.getObject3D('mesh').material.depthTest = false;
    },

    onMenuButtonClick: function (evt) {
      var movieInfo = this.movieInfo[evt.currentTarget.id];

      this.backgroundEl.object3D.scale.set(1, 1, 1);

      this.el.object3D.scale.set(1, 1, 1);
      if (AFRAME.utils.device.isMobile()) { this.el.object3D.scale.set(1.4, 1.4, 1.4); }
      this.el.object3D.visible = true;
      this.fadeBackgroundEl.object3D.visible = true;

      if (this.movieImageEl) { this.movieImageEl.object3D.visible = false; }
      this.movieImageEl = movieInfo.imgEl;
      this.movieImageEl.object3D.visible = true;

      this.movieTitleEl.setAttribute('text', 'value', movieInfo.title);
      this.movieDescriptionEl.setAttribute('text', 'value', movieInfo.description);
    },

    onBackgroundClick: function (evt) {
      this.backgroundEl.object3D.scale.set(0.001, 0.001, 0.001);
      this.el.object3D.scale.set(0.001, 0.001, 0.001);
      this.el.object3D.visible = false;
      this.fadeBackgroundEl.object3D.visible = false;
    }
  });

  AFRAME.registerComponent('fps-counter', {
    schema: {
      for90fps: {default: true}
    },

    init: function () {
      this.el.setAttribute('text', {align: 'center', side: 'double'});
      this.frameCount = 0;
      this.frameDuration = 0;
    },

    tick: function (t, dt) {
      var color;
      var fps;

      color = 'green';
      if (this.data.for90fps) {
        if (fps < 85) { color = 'yellow'; }
        if (fps < 80) { color = 'orange'; }
        if (fps < 75) { color = 'red'; }
      } else {
        if (fps < 55) { color = 'yellow'; }
        if (fps < 50) { color = 'orange'; }
        if (fps < 45) { color = 'red'; }
      }

      if (color) {
        this.el.setAttribute('text', 'color', color);
      }

      this.frameCount++;
      this.frameDuration += dt;

      if (this.frameCount === 10) {
        fps = 1000 / (this.frameDuration / this.frameCount);
        this.el.setAttribute('text', 'value', fps.toFixed(0) + ' fps');
        this.frameCount = 0;
        this.frameDuration = 0;
      }
    }
  });


}