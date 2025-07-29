import React from 'react';
import Assets from './Assets';
import { Select_Robot } from './Model';
import Controller from './webcontroller.js';

export default function RobotScene(props) {
  const {
    robot_model, rendered, state_codes, state_codes_left,
    robotProps, controllerProps, dsp_message,
    c_pos_x, c_pos_y, c_pos_z, c_deg_x, c_deg_y, c_deg_z, 
    position_ee, 
    euler_ee, 
    vr_controller_pos, 
    vr_controller_R,
    position_ee_left, 
    euler_ee_left, 
    vr_controller_pos_left, 
    vr_controller_R_left,
    modelOpacity, webcamStream1, webcamStream2,
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

  const rad2deg = rad => rad * 180 / Math.PI;
  const euler_ee_deg = euler_ee.map(rad2deg);
  const euler_ee_deg_left = euler_ee_left.map(rad2deg);
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
      const videoEl = document.getElementById('remotevideo-webcam1');
      if (videoEl && videoEl.srcObject !== props.webcamStream1) {
        videoEl.srcObject = props.webcamStream1;
        videoEl.play();
      }
    }
  }, [props.webcamStream1]);

  React.useEffect(() => {
    if (props.webcamStream2) {
      const videoEl = document.getElementById('remotevideo-webcam2');
      if (videoEl && videoEl.srcObject !== props.webcamStream2) {
        videoEl.srcObject = props.webcamStream2;
        videoEl.play();
      }
    }
  }, [props.webcamStream2]);

  if (!rendered) {
    return (
      <a-scene xr-mode-ui="XRMode: ar">
        <Assets robot_model={robot_model} viewer={props.viewer}/>
      </a-scene>
    );
    }

  return (
    <>
      <a-scene scene xr-mode-ui="XRMode: ar">
        {/* VR Controller */}
        <a-entity oculus-touch-controls="hand: right" vr-controller-right visible={true}></a-entity>
        <a-entity oculus-touch-controls="hand: left" vr-controller-left visible={true}></a-entity>

        {/* Robot Model*/}
        <Assets robot_model={robot_model} viewer={props.viewer} monitor={props.monitor}/>
        <Select_Robot {...robotProps} modelOpacity={props.modelOpacity}/>

        {/* Remote Cam*/}
        <a-assets>
          <video id="remotevideo-webcam1" autoPlay playsInline crossOrigin="anonymous" muted></video>
        </a-assets>

        <a-video
          src="#remotevideo-webcam1"
          width="1.6"
          height="0.9"
          position="0 0.5 -1.0"
          visible="false"
        ></a-video>

        <a-assets>
          <video id="remotevideo-webcam2" autoPlay playsInline crossOrigin="anonymous" muted></video>
        </a-assets>

        <a-video
          src="#remotevideo-webcam2"
          width="1.6"
          height="0.9"
          position="-1.0 0.5 -1.0"
          rotation="0 45 0"
          visible="false"
        ></a-video>

        {/* Light */}
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
        <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #EFE; intensity: 0.1" position="0 -1 0"></a-entity>
        <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>

          {/* Camera */}
          <a-camera id="camera" cursor="rayOrigin: mouse;" position="0 0 0">
            <a-entity jtext={`text: ${dsp_message}; color: black; background:rgb(31, 219, 131); border: #000000`} position="0 0.7 -1.4"></a-entity>
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
         
      </a-scene>
      <Controller {...controllerProps}/>
      <div className="footer">
        <div>{`add information here`}</div>
      </div>
    </>
  );
}