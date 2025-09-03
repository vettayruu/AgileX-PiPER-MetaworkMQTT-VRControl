import React from 'react';
import Assets from './Assets';
import { Select_Robot } from './Model';
import Controller from './webcontroller.js';

export default function RobotScene(props) {
  const {
    robot_list, 
    robotProps, 
    
    // VR
    rendered, 
    controllerProps, 
    c_pos_x, c_pos_y, c_pos_z, c_deg_x, c_deg_y, c_deg_z,

    // Right Arm
    state_codes, 
    position_ee, 
    euler_ee, 
    vr_controller_pos, 
    vr_controller_R,

    // Left Arm
    state_codes_left,
    position_ee_left, 
    euler_ee_left, 
    vr_controller_pos_left, 
    vr_controller_R_left,

    // Cam Arm
    state_codes_cam,
    position_ee_cam,
    euler_ee_cam,

    // Others
    modelOpacity, 
    webcamStream1, 
    webcamStream2,
    dsp_message,
    showMenu
  } = props;

  const getStateCodeColor = (code) => {
    const colorMap = {
      0x00: "yellow",    // NORMAL
      0x01: "red",       // IK_FAILED  
      0x02: "orange",    // VELOCITY_LIMIT
      0x03: "purple",    // JOINT_LIMIT
      0x04: "pink",      // SINGULARITY
      0x05: "gray",      // VR_INPUT_INVALID
      0x06: "blue",      // JACOBIAN_ERROR
      0x07: "cyan",      // TARGET_UNREACHABLE
    };
    return colorMap[code] || "white";
  };

  const stateCodeColor = getStateCodeColor(state_codes);
  const stateCodeColorLeft = getStateCodeColor(state_codes_left);
  const stateCodeColorCam = getStateCodeColor(state_codes_cam);

  const rad2deg = rad => rad * 180 / Math.PI;
  const euler_ee_deg = euler_ee.map(rad2deg);
  const euler_ee_deg_left = euler_ee_left.map(rad2deg);
  const euler_ee_deg_cam = euler_ee_cam.map(rad2deg);
  // const vr_controller_euler_deg = vr_controller_euler.map(rad2deg);

  const scale = 0.1;
  const xAxis = {
    x: vr_controller_R[0][0] * scale,
    y: vr_controller_R[1][0] * scale,
    z: vr_controller_R[2][0] * scale,
  };
  const yAxis = {
    x: vr_controller_R[0][1] * scale,
    y: vr_controller_R[1][1] * scale,
    z: vr_controller_R[2][1] * scale,
  };
  const zAxis = {
    x: vr_controller_R[0][2] * scale,
    y: vr_controller_R[1][2] * scale,
    z: vr_controller_R[2][2] * scale,
  };

  const xAxis_left = {
    x: vr_controller_R_left[0][0] * scale,
    y: vr_controller_R_left[1][0] * scale,
    z: vr_controller_R_left[2][0] * scale,
  };
  const yAxis_left = {
    x: vr_controller_R_left[0][1] * scale,
    y: vr_controller_R_left[1][1] * scale,
    z: vr_controller_R_left[2][1] * scale,
  };
  const zAxis_left = {
    x: vr_controller_R_left[0][2] * scale,
    y: vr_controller_R_left[1][2] * scale,
    z: vr_controller_R_left[2][2] * scale,
  };

  // Webcam Stream
  React.useEffect(() => {
    if (props.webcamStream1) {
      const videoEl = document.getElementById('leftVideo');
      if (videoEl && videoEl.srcObject !== props.webcamStream1) {
        videoEl.srcObject = props.webcamStream1;
        videoEl.play();
      }
    }
  }, [props.webcamStream1]);

  React.useEffect(() => {
    if (props.webcamStream2) {
      const videoEl = document.getElementById('rightVideo');
      if (videoEl && videoEl.srcObject !== props.webcamStream2) {
        videoEl.srcObject = props.webcamStream2;
        videoEl.play();
      }
    }
  }, [props.webcamStream2]);

  if (!rendered) {
    return (
      <a-scene xr-mode-ui="XRMode: ar">
        <Assets robot_list={robot_list} viewer={props.viewer}/>
      </a-scene>
    );
    }

  return (
    <>
      <a-scene scene xr-mode-ui="XRMode: ar">
        {/* <a-entity
          id="background"
          position="0 0 0"
          geometry="primitive: sphere; radius: 2.0"
          material="color: red; side: back; shader: flat"
          scale="0.001 0.001 0.001"
          visible="true" class="raycastable">
        </a-entity>

        <a-entity
          position="0 1.6 0"
          camera look-controls="magicWindowTrackingEnabled: false; touchEnabled: false; mouseEnabled: false">
          <a-entity
            id="fadeBackground"
            geometry="primitive: sphere; radius: 2.5"
            material="color: #999999; side: back; shader: flat; blending: subtractive;" visible="false">
          </a-entity>
        </a-entity>

        <a-entity id="menu" highlight>
          <a-entity id="myCustomButton1" position="0 0.6 -0.5" class="raycastable menu-button"
                    geometry="primitive: plane; width: 0.4; height: 0.2"
                    material="color: #1976d2; opacity: 0.85">
            <a-text value="Button" align="center" color="#ffffffff" width="0.38" position="0 0 0.01"></a-text>
          </a-entity>
        </a-entity>

        <a-entity id="leftHand" laser-controls="hand: left" raycaster="objects: .raycastable"></a-entity>
        <a-entity id="rightHand" laser-controls="hand: right" raycaster="objects: .raycastable" line="color: #118A7E"></a-entity>

        <a-entity
          id="infoPanel"
          position="0 0 0.5"
          info-panel
          visible="false"
          scale="0.001 0.001 0.001"
          geometry="primitive: plane; width: 1.5; height: 1.8"
          material="color: #333333; shader: flat; transparent: false" class="raycastable">
          <a-entity id="ponyoMovieImage" mixin="movieImage" material="src: #ponyo" visible="false"></a-entity>
          <a-entity id="kazetachinuMovieImage" mixin="movieImage" material="src: #kazetachinu" visible="false"></a-entity>
          <a-entity id="karigurashiMovieImage" mixin="movieImage" material="src: #karigurashi" visible="false"></a-entity>
          <a-entity id="movieTitle"
            position="-0.68 -0.1 0"
            text="shader: msdf; anchor: left; width: 1.5; font: https://cdn.aframe.io/examples/ui/Viga-Regular.json; color: white; value: Ponyo (2003)"></a-entity>
          <a-entity id="movieDescription"
            position="-0.68 -0.2 0"
            text="baseline: top; shader: msdf; anchor: left; font: https://cdn.aframe.io/examples/ui/Viga-Regular.json; color: white; value: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."></a-entity>
        </a-entity> */}
        {/* <a-entity position="0 0 0" fps-counter></a-entity> */}

        {/* VR Controller */}
        <a-entity oculus-touch-controls="hand: right" vr-controller-right visible={true}></a-entity>
        <a-entity oculus-touch-controls="hand: left" vr-controller-left visible={true}></a-entity>

        {/* Robot Model*/}
        <Assets robot_list={robot_list} viewer={props.viewer} monitor={props.monitor}/>
        <Select_Robot {...robotProps} modelOpacity={props.modelOpacity}/>

        {/* Remote Cam*/}
        <a-assets>
          <video id="leftVideo" autoPlay playsInline crossOrigin="anonymous" muted></video>
          <video id="rightVideo" autoPlay playsInline crossOrigin="anonymous" muted></video>
        </a-assets>

        {/* For 720P */}
        {/* <a-curvedimage
          id="left-curved"
          height="7.0"
          radius="5.7"
          theta-length="120"
          position="0.2 1.6 -1.0"
          rotation="0 -115 0"
          scale="-1 1 1"
          stereo-curvedvideo="eye: left; videoId: leftVideo">
        </a-curvedimage>

        <a-curvedimage
          id="right-curved"
          height="7.0"
          radius="5.7"
          theta-length="120"
          position="0.2 1.6 -1.0"
          rotation="0 -120.3 0"
          scale="-1 1 1"
          stereo-curvedvideo="eye: right; videoId: rightVideo">
        </a-curvedimage> */}

        {/* For 1080P */}
        {/* <a-curvedimage
          id="left-curved"
          height="9.0"
          radius="5.7"
          theta-length="180"
          position="-0.30 1.2 -1.50"
          rotation="0 -115 0"
          scale="-1 1 1"
          stereo-curvedvideo="eye: left; videoId: leftVideo"
          visible="true"
        ></a-curvedimage>

        <a-curvedimage
          id="right-curved"
          height="9.0"
          radius="5.7"
          theta-length="180"
          position="0.20. 1.2 -1.50"
          rotation="0 -121 0"
          scale="-1 1 1"
          stereo-curvedvideo="eye: right; videoId: rightVideo"
          visible="true"
        ></a-curvedimage> */}

        {/* Plane */}
        <a-plane
          id="left-curved"
          height="4.0"
          width="7.0"
          position="-0.19 1.0 -2.3"
          scale="0.6 0.6 0.2"
          stereo-plane="eye: left; videoId: leftVideo"
          visible="false"
        ></a-plane>

        <a-plane
          id="right-curved"
          height="4.0"
          width="7.0"
          position="0.19 1.0 -2.3"
          scale="0.6 0.6 0.2"
          stereo-plane="eye: right; videoId: rightVideo"
          visible="false"
        ></a-plane>

        {/* <a-sphere
          id="left-curved"
          // radius="800"
          position="-0.28 1.0 -0.5"
          scale="-0.05 0.062 0.015"
          stereo-spherevideo="eye: left; videoId: leftVideo"
          geometry="primitive: sphere; radius: 8; thetaStart: 0; thetaLength: 180"
        ></a-sphere>

        <a-sphere
          id="right-curved"
          // radius="8"
          position="0.28 1.0 -0.5"
          scale="-0.05 0.062 0.015"
          stereo-spherevideo="eye: right; videoId: rightVideo"
          geometry="primitive: sphere; radius: 8; thetaStart: 0; thetaLength: 180"
        ></a-sphere> */}
        
        
        {/* Light */}
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
        <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #EFE; intensity: 0.1" position="0 -1 0"></a-entity>
        <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>

          {/* Camera */}
          <a-camera id="camera" cursor="rayOrigin: mouse;" position="0 0 0">
            {/* <a-entity jtext={`text: ${dsp_message}; color: black; background:rgb(31, 219, 255); border: #000000`} position="0 0.7 -1.4"></a-entity>
            <a-curvedimage
              id="left-curved"
              height="9.0"
              radius="5.7"
              theta-length="155"
              position="-0.2 0 0"
              rotation="0 -115 0"
              scale="-1 1 1"
              stereo-curvedvideo="eye: left; videoId: leftVideo"
            ></a-curvedimage>

            <a-curvedimage
              id="right-curved"
              height="9.0"
              radius="5.7"
              theta-length="155"
              position="-0.2 0 0"
              rotation="0 -121 0"
              scale="-1 1 1"
              stereo-curvedvideo="eye: right; videoId: rightVideo"
            ></a-curvedimage> */}
          </a-camera>

          {/* End Effector Right*/}
          </a-entity>
          <a-sphere 
            position={`${position_ee[0]+0.3} ${position_ee[1]} ${position_ee[2]}`} 
            scale="0.012 0.012 0.012" 
            color={stateCodeColor}
            visible={true}></a-sphere>
          <a-entity
            position={`${position_ee[0]+0.3} ${position_ee[1]} ${position_ee[2]}`}
            // ZYX
            rotation={`${euler_ee_deg[0]} ${-euler_ee_deg[2]} ${-euler_ee_deg[1]} `}
          >
            <a-cylinder position="0      0     -0.015" rotation="90 0  0 " height="0.0500" radius="0.0015" color="red" /> 
            <a-cylinder position="-0.015      0     0" rotation="0  0  90" height="0.0500" radius="0.0015" color="green" />
            <a-cylinder position="0      0.025      0" rotation="0  90 0 " height="0.0700" radius="0.0015" color="blue" />
          </a-entity>

          {/* End Effector Right Copy*/}
          <a-entity
            position={`${vr_controller_pos[0]} ${vr_controller_pos[1]} ${vr_controller_pos[2]}`} 
            // ZYX
            rotation={`${euler_ee_deg[0]} ${-euler_ee_deg[2]} ${-euler_ee_deg[1]} `}
            >
            <a-cylinder position="0      0     -0.05" rotation="90 0  0 " height="0.150" radius="0.0035" color="red" /> 
            <a-cylinder position="-0.05      0     0" rotation="0  0  90" height="0.150" radius="0.0035" color="green" />
            <a-cylinder position="0      0.05      0" rotation="0  90 0 " height="0.150" radius="0.0035" color="blue" />
          </a-entity>

          {/* End Effector Left */}
          <a-sphere 
            position={`${position_ee_left[0]-0.3} ${position_ee_left[1]} ${position_ee_left[2]}`} 
            scale="0.012 0.012 0.012" 
            color={stateCodeColorLeft}
            visible={true}></a-sphere>
          <a-entity
            position={`${position_ee_left[0]-0.3} ${position_ee_left[1]} ${position_ee_left[2]}`}
            // ZYX
            rotation={`${euler_ee_deg_left[0]} ${-euler_ee_deg_left[2]} ${-euler_ee_deg_left[1]} `}
            >
            <a-cylinder position="0      0     -0.015" rotation="90 0  0 " height="0.0500" radius="0.0015" color="red" /> 
            <a-cylinder position="-0.015      0     0" rotation="0  0  90" height="0.0500" radius="0.0015" color="green" />
            <a-cylinder position="0      0.025      0" rotation="0  90 0 " height="0.0700" radius="0.0015" color="blue" />
          </a-entity>

          {/* End Effector Left Copy*/}
          <a-entity
            position={`${vr_controller_pos_left[0]} ${vr_controller_pos_left[1]} ${vr_controller_pos_left[2]}`} 
            // ZYX
            rotation={`${euler_ee_deg_left[0]} ${-euler_ee_deg_left[2]} ${-euler_ee_deg_left[1]} `}
            >
            <a-cylinder position="0      0     -0.05" rotation="90 0  0 " height="0.150" radius="0.0035" color="red" /> 
            <a-cylinder position="-0.05      0     0" rotation="0  0  90" height="0.150" radius="0.0035" color="green" />
            <a-cylinder position="0      0.05      0" rotation="0  90 0 " height="0.150" radius="0.0035" color="blue" />
          </a-entity>

          {/* End Effector Cam */}
          <a-sphere 
            position={`${position_ee_cam[0]} ${position_ee_cam[1]+0.208} ${position_ee_cam[2]+0.035}`} 
            scale="0.012 0.012 0.012" 
            color={stateCodeColorCam}
            visible={true}></a-sphere>
          <a-entity
            position={`${position_ee_cam[0]} ${position_ee_cam[1]+0.208} ${position_ee_cam[2]+0.035}`}
            // ZYX
            rotation={`${euler_ee_deg_cam[0]} ${-euler_ee_deg_cam[2]} ${-euler_ee_deg_cam[1]} `}
          >

            {/* ZYX */}
            <a-cylinder position="0      0     -0.015" rotation="90 0  0 " height="0.0500" radius="0.0015" color="red" /> 
            <a-cylinder position="-0.015      0     0" rotation="0  0  90" height="0.0500" radius="0.0015" color="green" />
            <a-cylinder position="0      0.025      0" rotation="0  90 0 " height="0.0700" radius="0.0015" color="blue" />
          </a-entity>

          {/* VR Controller Pose Right*/}
          <a-entity
            position={`${vr_controller_pos[0]} ${vr_controller_pos[1]} ${vr_controller_pos[2]}`} 
          >
            <a-entity
              line={`start: 0 0 0; end: ${xAxis.x} ${xAxis.y} ${xAxis.z}; color: red;`}
              visible="true"
              opacity="0.3"
            />
            <a-entity
              line={`start: 0 0 0; end: ${yAxis.x} ${yAxis.y} ${yAxis.z}; color: green;`}
              visible="true"
              opacity="0.3"
            />
            <a-entity
              line={`start: 0 0 0; end: ${zAxis.x} ${zAxis.y} ${zAxis.z}; color: blue;`}
              visible="true"
              opacity="0.3"
            />
          </a-entity>

          {/* VR Controller Pose Left*/}
          <a-entity
            position={`${vr_controller_pos_left[0]} ${vr_controller_pos_left[1]} ${vr_controller_pos_left[2]}`} 
          >
            <a-entity
              line={`start: 0 0 0; end: ${xAxis_left.x} ${xAxis_left.y} ${xAxis_left.z}; color: red;`}
              visible="true"
              opacity="0.3"
            />
            <a-entity
              line={`start: 0 0 0; end: ${yAxis_left.x} ${yAxis_left.y} ${yAxis_left.z}; color: green;`}
              visible="true"
              opacity="0.3"
            />
            <a-entity
              line={`start: 0 0 0; end: ${zAxis_left.x} ${zAxis_left.y} ${zAxis_left.z}; color: blue;`}
              visible="true"
              opacity="0.3"
            />
          </a-entity>

          {/*Point Cloud*/}
          {/* <a-entity ply-pointcloud="https://192.168.197.52:5001/pointcloud" position="0 0 0" rotation="180 0 0"></a-entity> */}
          {/* <a-entity ply-pointcloud="http://localhost:3000/zed_mini_pointcloud.ply" position="0 0 0"></a-entity> */}
         
      </a-scene>

      <Controller {...controllerProps}/>
      <div className="footer">
        <div>{`add information here`}</div>
      </div>
    </>
  );
}