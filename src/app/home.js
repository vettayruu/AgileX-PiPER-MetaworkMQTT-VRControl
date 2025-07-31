"use client";
import 'aframe'
import * as React from 'react'
import RemoteWebcam from './remote_webcam';
import RobotScene from './RobotScene';

import registerAframeComponents from './registerAframeComponents'; 
import useMqtt from './useMqtt';
import { mqttclient, idtopic, publishMQTT, subscribeMQTT, codeType } from '../lib/MetaworkMQTT'

/* ============================= Static Global Variables ==========================================*/
const THREE = window.AFRAME.THREE;
const mr = require('../modern_robotics/modern_robotics_core.js');
const mynp = require('../modern_robotics/my_numpy.js');
const RobotKinematics = require('../modern_robotics/modern_robotics_Kinematics.js');
const RobotDynamcis = require('../modern_robotics/modern_robotics_Dynamics.js');

// Load Robot Model
const robot_model = "agilex_piper"; // Change this to your robot model: jaka_zu_5, agilex_piper
const toolLimit = { min: -1, max: 89 }; 

const Euler_order = 'ZYX'; // Euler angle order
const VR_Control_Mode = 'inBody'; // VR control mode: 'inSpace' or 'inBody'

const dt = 16.67/1000; // VR input period in seconds (60Hz)

// MQTT Topics
const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/" + idtopic;
const MQTT_CTRL_TOPIC = "control/"; 
const MQTT_ROBOT_STATE_TOPIC = "robot/";

// IK State Codes
const STATE_CODES = {
  NORMAL: 0x00,
  IK_FAILED: 0x01,
  VELOCITY_LIMIT: 0x02,
  JOINT_LIMIT: 0x03,
};

/* ============================= Functions ==========================================*/
const loadRobotParams = (robot_model) => {
  const rk = new RobotKinematics(robot_model);
  const M = rk.get_M();
  const Slist = rk.get_Slist();
  const jointLimits = rk.jointLimits;
  const Blist = mr.SlistToBlist(M, Slist);
  const jointInitial = rk.get_jointInitial();

  return {
    M,
    Slist,
    jointLimits,
    Blist,
    jointInitial
  };
};


/** FK **/
function FK(robotParams, theta_body, VR_Control_Mode) {
  const M = robotParams.M;
  const Slist = robotParams.Slist;
  const Blist = robotParams.Blist;

  let T;
  if (VR_Control_Mode === 'inBody') {
    T = mr.FKinBody(M, Blist, theta_body);
  }
  else if (VR_Control_Mode === 'inSpace') {
    T = mr.FKinSpace(M, Slist, theta_body);
  } else {
    throw new Error(`Invalid VR_Control_Mode: ${VR_Control_Mode}. Use 'inSpace' or 'inBody'.`);
  }
  return T;
}

/** IK **/
function IK_joint_velocity_limit(T_sd, robotParams, theta_body, VR_Control_Mode) {
  let thetalist_sol, ik_success;
  const max_joint_velocity = 5.5; // Maximum joint velocity limit

  const M = robotParams.M;
  const Slist = robotParams.Slist;
  const Blist = robotParams.Blist;
  const jointLimits = robotParams.jointLimits;

  let error_code = STATE_CODES.NORMAL;

  if (VR_Control_Mode === 'inBody') {
    [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body, 1e-5, 1e-5);
  } 
  else if (VR_Control_Mode === 'inSpace') {
    [thetalist_sol, ik_success] = mr.IKinSpace(Slist, M, T_sd, theta_body, 1e-5, 1e-5);
  }

  if (ik_success) {
    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
    );

    const delta_theta_body = thetalist_sol_limited.map((theta, i) => theta - theta_body[i]);
    const d_theta_body = delta_theta_body.map((val) => val / dt);

    const [joint_ometahat, joint_theta] = mr.AxisAng3(d_theta_body);

    const joint_theta_limited = Math.max(0, Math.min(max_joint_velocity, joint_theta));

    const new_theta_body = theta_body.map((theta, i) => theta + joint_ometahat[i] * joint_theta_limited * dt);

    if (joint_theta_limited === max_joint_velocity) {
      error_code = STATE_CODES.VELOCITY_LIMIT; 
    }
    return { new_theta_body, error_code }; 
  } else {
    console.warn("IK failed to converge");
    error_code = STATE_CODES.IK_FAILED;
    return { new_theta_body: theta_body, error_code };
  }
}


/**
 * VR Controller Relative Rotation Matrix Update
 * @param {Array<number>} controller_object.quaternion // controller quaternion in 3D space
 * @returns {Array<number>} vr_controller_R_relative   // Return the relative Rotation Matrix of the VR controller
 */

function vrquatToR(vr_controller_quat, VR_Control_Mode) {
  // Initial offset quaternion to correct the VR controller orientation
  const initialOffsetQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler((0.6654549523360951 * -1), 0, 0, Euler_order)
  );
  const vrQuat = new THREE.Quaternion().multiplyQuaternions(vr_controller_quat, initialOffsetQuat);

  // Transform vr controller's frame to world frame
  const worldOffsetQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler((Math.PI/2 * -1), Math.PI/2, 0, Euler_order)
  );
  const spaceQuat = new THREE.Quaternion().multiplyQuaternions(vrQuat, worldOffsetQuat);

  // Offset quaternion to correct the end effector orientation
  const bodyOffsetQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler( Math.PI, 0, Math.PI, Euler_order)
  );
  const bodyQuat = new THREE.Quaternion().multiplyQuaternions(spaceQuat, bodyOffsetQuat);

  // Transform the corrected quaternion to a rotation matrix
  const matrix = new THREE.Matrix4();
  if (VR_Control_Mode === 'inSpace') {
    matrix.makeRotationFromQuaternion(spaceQuat);
  } else if (VR_Control_Mode === 'inBody') {
    matrix.makeRotationFromQuaternion(bodyQuat);
  }

  // The columns of the rotation matrix represent the axes of the controller
  const elements = matrix.elements;
  const vr_controller_R = [
    [elements[0], elements[4], elements[8]],
    [elements[1], elements[5], elements[9]],
    [elements[2], elements[6], elements[10]]
  ];
  return vr_controller_R;
}


export default function DynamicHome(props) {
  const [now, setNow] = React.useState(new Date())
  const [rendered, set_rendered] = React.useState(false)

  const robotNameList = ["Model"]
  const [robotName,set_robotName] = React.useState(robotNameList[0])

  const [robot_model_left, setRobotModelLeft] = React.useState("agilex_piper");
  const [robot_model_right, setRobotModelRight] = React.useState("agilex_piper");

  const [robotParams, setRobotParams] = React.useState({
    left: null,  // left control robot parameters
    right: null, // right control robot parameters
  });

  React.useEffect(() => {
    const leftParams = loadRobotParams(robot_model_left);
    const rightParams = loadRobotParams(robot_model_right);
    setRobotParams((prev) => ({
      ...prev,
      left: leftParams,
      right: rightParams,
    }));
  }, [robot_model_left, robot_model_right]);

  React.useEffect(() => {
    if (robotParams.left !== null && robotParams.right !== null) {
      console.log("Load Robot Params Left:", robotParams.left);
      console.log("Load Robot Params Right:", robotParams.right);
    }
  }, [robotParams.left, robotParams.right]);

  const [error_code, setErrorCode] = React.useState(STATE_CODES.NORMAL);
  const [error_code_left, setErrorCodeLeft] = React.useState(STATE_CODES.NORMAL);

  // VR controller state
  const vrModeRef = React.useRef(false);
  
  // Right Controller
  const [trigger_on,set_trigger_on] = React.useState(false)
  const [grip_on, set_grip_on] = React.useState(false)
  const [button_a_on, set_button_a_on] = React.useState(false)
  const [button_b_on, set_button_b_on] = React.useState(false)
  const [controller_object, set_controller_object] = React.useState(() => {
    const controller_object = new THREE.Object3D();
    console.log("Right Controller Object Created:", controller_object);
    return controller_object;
    });

  // Left Controller
  const [trigger_on_left,set_trigger_on_left] = React.useState(false)
  const [grip_on_left, set_grip_on_left] = React.useState(false)
  const [button_x_on, set_button_x_on] = React.useState(false)
  const [button_y_on, set_button_y_on] = React.useState(false)
  const [controller_object_left, set_controller_object_left] = React.useState(() => {
    const controller_object_left = new THREE.Object3D();
    console.log("Left Controller Object Created:", controller_object_left);
    return controller_object_left;
  });

  const [selectedMode, setSelectedMode] = React.useState('control'); 
  const robotIDRef = React.useRef(idtopic); 

  // VR camera pose
  const [c_pos_x,set_c_pos_x] = React.useState(0.23)
  const [c_pos_y,set_c_pos_y] = React.useState(0.3)
  const [c_pos_z,set_c_pos_z] = React.useState(-0.6)
  const [c_deg_x,set_c_deg_x] = React.useState(0)
  const [c_deg_y,set_c_deg_y] = React.useState(150)
  const [c_deg_z,set_c_deg_z] = React.useState(0)

  const [dsp_message,set_dsp_message] = React.useState("")

  // Remote Webcam
  const [webcamStream1, setWebcamStream1] = React.useState(null);
  const [webcamStream2, setWebcamStream2] = React.useState(null);

  // Robot Tool
  const toolNameList = ["No tool"]
  const [toolName,set_toolName] = React.useState(toolNameList[0])

  // Frame ID
  const reqIdRef = React.useRef()
  
  // Animation loop
  const loop = ()=>{
    reqIdRef.current = window.requestAnimationFrame(loop) 
  }
  React.useEffect(() => {
    loop()
    return () => window.cancelAnimationFrame(reqIdRef.current) 
  },[])

  // Change Robot
  const robotChange = ()=>{
    const get = (robotName)=>{
      let changeIdx = robotNameList.findIndex((e)=>e===robotName) + 1
      if(changeIdx >= robotNameList.length){
        changeIdx = 0
      }
      return robotNameList[changeIdx]
    }
    set_robotName(get)
  }

  // Set Model Opacity
  const [modelOpacity, setModelOpacity] = React.useState(1.0); 
    React.useEffect(() => {
    const scene = document.querySelector('a-scene');
    if (!scene) return;
    
    // In VR mode, set model opacity to 0.3
    function handleEnterVR() {
      setModelOpacity(0.3);
    }
    // In viewer mode, set model opacity to 1.0
    function handleExitVR() {
      setModelOpacity(1.0);
    }

    scene.addEventListener('enter-vr', handleEnterVR);
    scene.addEventListener('exit-vr', handleExitVR);

    return () => {
      scene.removeEventListener('enter-vr', handleEnterVR);
      scene.removeEventListener('exit-vr', handleExitVR);
    };
  }, []);


  /* ---------------------- Control Parameters ------------------------------------*/
  // Right Arm 
  const [robot_state, setRobotState] = React.useState(null);
  const [theta_body, setThetaBody] = React.useState([0, 0, 0, 0, 0, 0]);
  const [theta_tool, setThetaTool] = React.useState(0);

  // Left Arm
  const [robot_state_left, setRobotStateLeft] = React.useState(null);
  const [theta_body_left, setThetaBodyLeft] = React.useState([0, 0, 0, 0, 0, 0]);
  const [theta_tool_left, setThetaToolLeft] = React.useState(0);

  // Collision Check
  const [collision, setCollision] = React.useState(false);

  /* ---------------------- Right Arm Initialize ------------------------------------*/
  const [position_ee, setPositionEE] = React.useState([0,0,0]);
  const [euler_ee, setEuler] = React.useState([0,0,0]);
  const [R_ee, setREE] = React.useState(
    [1,0,0],
    [0,1,0],
    [0,0,1]
  );

  const position_ee_Three = mr.worlr2three(position_ee);
  const euler_ee_Three = mr.worlr2three(euler_ee);

  React.useEffect(() => {
    if (robotParams.left !== null && robotParams.right !== null) {
      const T0 = FK(robotParams.right, robotParams.right.jointInitial, VR_Control_Mode);
      const [R0, p0] = mr.TransToRp(T0);
      setThetaBody(robotParams.right.jointInitial);
      // setThetaBodyGuess(robotParams.right.jointInitial);
      setPositionEE(p0);
      setREE(R0);
      setEuler(mr.RotMatToEuler(R0, Euler_order));
      console.log("Right Robot Arm Initialized");
    }
  }, [robotParams.left, robotParams.right]);

  React.useEffect(() => {
    if (rendered) {
      const T_right = FK(robotParams.right, theta_body, VR_Control_Mode);
      const [R_right, p] = mr.TransToRp(T_right);
      setPositionEE(p);
      setEuler(mr.RotMatToEuler(R_right, Euler_order)); 
      setREE(R_right);
    }
  }, [rendered, theta_body]);

  /* ---------------------- Left Arm Initialize ------------------------------------*/
  const [position_ee_left, setPositionEELeft] = React.useState([0,0,0]);
  const [euler_ee_left, setEulerEELeft] = React.useState([0,0,0]);
  const [R_ee_left, setREELeft] = React.useState(
    [1,0,0],
    [0,1,0],
    [0,0,1]
  );

  const position_ee_Three_left = mr.worlr2three(position_ee_left);
  const euler_ee_Three_left = mr.worlr2three(euler_ee_left);

  React.useEffect(() => {
    if (robotParams.left !== null && robotParams.right !== null) {
      const T0_left = FK(robotParams.left, robotParams.left.jointInitial, VR_Control_Mode);
      const [R0_left, p0_left] = mr.TransToRp(T0_left);
      setThetaBodyLeft(robotParams.left.jointInitial);
      // setThetaBodyGuessLeft(robotParams.left.jointInitial);
      setPositionEELeft(p0_left);
      setREELeft(R0_left);
      setEulerEELeft(mr.RotMatToEuler(R0_left, Euler_order));
      console.log("Left Robot Arm Initialized");
    }
  }, [robotParams.left, robotParams.right]);

  React.useEffect(() => {
    if (rendered){
      const T_left = FK(robotParams.left, theta_body_left, VR_Control_Mode);
      const [R_left, p_left] = mr.TransToRp(T_left);
      setPositionEELeft(p_left);
      setEulerEELeft(mr.RotMatToEuler(R_left, Euler_order)); 
      setREELeft(R_left);
    }
  }, [rendered, theta_body_left]);

  /*======================= VR Right Robot Arm Control ====================================*/
  /* ---------------------- Right VR Controller Motion ------------------------------------*/
  // Update VR controller position and rotation matrix
  // !! Do not use Euler angle, since it can cause gimbal lock !!
  
  /*** Position Update ***/
  const vr_controller_pos = [
  controller_object.position.x,
  controller_object.position.y,
  controller_object.position.z
  ];

  // Use last VR controller position for delta calculation
  const lastVRPosRef = React.useRef(null);

  // Return delta position of VR controller for robot control
  const [vr_controller_p_diff, setVRControllerPosDiff] = React.useState([0, 0, 0]);

  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on) {
      if (!lastVRPosRef.current) {
        // First time trigger is pressed, store the initial position
        lastVRPosRef.current = [...vr_controller_pos];
        setVRControllerPosDiff([0, 0, 0]); 

      } else {
        const pos_diff = [
          vr_controller_pos[0] - lastVRPosRef.current[0],
          vr_controller_pos[1] - lastVRPosRef.current[1], 
          vr_controller_pos[2] - lastVRPosRef.current[2]
        ];

        const pos_diff_world = mr.three2world(pos_diff);
        // console.log("VR Controller Position Diff:", pos_diff_world);

        // Update last frame position
        lastVRPosRef.current = [...vr_controller_pos];
        setVRControllerPosDiff(pos_diff_world);
      }
    }
  }, [
    controller_object.position.x,
    controller_object.position.y,
    controller_object.position.z,
    rendered, 
    trigger_on, 
  ]);

  /*** Rotation Update ***/
  const vr_controller_R_current = vrquatToR(controller_object.quaternion, VR_Control_Mode);

  // Store initial rotation matrix when trigger is first pressed
  const lastRotationMatrixRef = React.useRef(null);
  const [vr_controller_R_relative, setVRControllerRmatrixRelative] = React.useState(
    [[1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]]
  );
  
  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on) {
      if (!lastRotationMatrixRef.current) {
        // First time trigger is pressed, store the initial rotation matrix
        lastRotationMatrixRef.current = [
          [...vr_controller_R_current[0]],
          [...vr_controller_R_current[1]],
          [...vr_controller_R_current[2]]
        ];

        const identity_matrix = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1]
        ];
        setVRControllerRmatrixRelative(identity_matrix);
        // console.log("Initial rotation matrix stored:", lastRotationMatrixRef.current);
      } else {

        const vr_controller_R_relative = mynp.calculateRelativeRotationMatrix(
          vr_controller_R_current, 
          lastRotationMatrixRef.current,
          VR_Control_Mode
        );

        setVRControllerRmatrixRelative(vr_controller_R_relative);
        lastRotationMatrixRef.current = [
          [...vr_controller_R_current[0]],
          [...vr_controller_R_current[1]],
          [...vr_controller_R_current[2]]
        ];
      }
    }
  }, [
    controller_object.quaternion.x,
    controller_object.quaternion.y,
    controller_object.quaternion.z,
    controller_object.quaternion.w,
    rendered, 
    trigger_on,
    vrModeRef.current
  ]);

  // Reset as when trigger is released
  React.useEffect(() => {
    if (rendered && vrModeRef.current && !trigger_on && lastVRPosRef.current) {
      lastVRPosRef.current = null;
      lastRotationMatrixRef.current = null;
      setVRControllerPosDiff([0, 0, 0]);
      setVRControllerRmatrixRelative(
        [[1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]]
      );
    }
  }, [trigger_on, rendered, vrModeRef.current]);

  /* ---------------------- Right Arm VR Control ------------------------------------*/
  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on) {
      const currentP = [...position_ee];
      const currentR = [...R_ee];

      // Calculate the new position and orientation based on VR controller input
      const [p_v, p_theta] = mr.AxisAng3(vr_controller_p_diff);
      const p_scale = 1.0; // Scale factor for position movement

      const newP = [
        currentP[0] + p_v[0] * p_theta * p_scale, // Scale factor for position
        currentP[1] + p_v[1] * p_theta * p_scale,
        currentP[2] + p_v[2] * p_theta * p_scale
      ];

      const R_scale = 1.0
      const [R_screw, R_theta] = mynp.relativeRMatrixtoScrewAxis(vr_controller_R_relative);
      const R_relative = mynp.ScrewAxisToRelativeRMatrix(R_screw, R_theta * R_scale); // Scale factor for rotation

      // Calculate the new orientation based on the relative rotation matrix
      let newT;
      if (VR_Control_Mode === 'inSpace') {
        const newR_inSpace = mr.matDot(R_relative, currentR);
        newT = mr.RpToTrans(newR_inSpace, newP);
      }
      else if (VR_Control_Mode === 'inBody') {
        const newR_inBody = mr.matDot(currentR, R_relative);
        newT = mr.RpToTrans(newR_inBody, newP);
      }
      else {
        console.warn("Invalid VR Control Mode, choose 'inSpace' or 'inBody'. Current:", VR_Control_Mode);
        return;
      }

      const { new_theta_body, error_code } = IK_joint_velocity_limit(newT, robotParams.right, theta_body, VR_Control_Mode);
      setThetaBody(new_theta_body);
      setErrorCode(error_code);
    }
  }, [
    vr_controller_p_diff,
    vr_controller_R_relative,
    rendered, 
    trigger_on,
    vrModeRef.current,
    lastVRPosRef.current,
    lastRotationMatrixRef.current,
  ]);

  /* ---------------------- Right Arm Tool VR Control ------------------------------------*/
  function clampTool(value) {
    return Math.max(toolLimit.min, Math.min(toolLimit.max, value));
  }
  React.useEffect(() => {
    let intervalId = null;
    if (grip_on && button_a_on) {
      intervalId = setInterval(() => {
        setThetaTool(prev => clampTool(prev + 0.5));
      }, 16.67); 
    }
    else if (grip_on && button_b_on) {
      intervalId = setInterval(() => {
        setThetaTool(prev => clampTool(prev - 0.5));
      }, 16.67); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [ button_a_on, button_b_on, grip_on]);


  /*======================= VR Right Left Arm Control ====================================*/
  /* ---------------------- Left VR Controller Motion ------------------------------------*/
  /*** Position Update ***/
  const vr_controller_pos_left = [
  controller_object_left.position.x,
  controller_object_left.position.y,
  controller_object_left.position.z
  ];

  // Use last VR controller position for delta calculation
  const lastVRPosRef_left = React.useRef(null);

  // Return delta position of VR controller for robot control
  const [vr_controller_p_diff_left, setVRControllerPosDiffLeft] = React.useState([0, 0, 0]);

  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on_left) {
      if (!lastVRPosRef_left.current) {
        // First time trigger is pressed, store the initial position
        lastVRPosRef_left.current = [...vr_controller_pos_left];
        setVRControllerPosDiffLeft([0, 0, 0]);

      } else {
        const pos_diff_left = [
          vr_controller_pos_left[0] - lastVRPosRef_left.current[0],
          vr_controller_pos_left[1] - lastVRPosRef_left.current[1],
          vr_controller_pos_left[2] - lastVRPosRef_left.current[2]
        ];

        const pos_diff_world_left = mr.three2world(pos_diff_left);

        // Update last frame position
        lastVRPosRef_left.current = [...vr_controller_pos_left];
        setVRControllerPosDiffLeft(pos_diff_world_left);
      }
    }
  }, [
    controller_object_left.position.x,
    controller_object_left.position.y,
    controller_object_left.position.z,
    rendered, 
    trigger_on_left, 
  ]);

  /*** Rotation Update ***/
  const vr_controller_R_current_left = vrquatToR(controller_object_left.quaternion, VR_Control_Mode);

  // Store initial rotation matrix when trigger is first pressed
  const lastRotationMatrixRef_left = React.useRef(null);
  const [vr_controller_R_relative_left, setVRControllerRmatrixRelativeLeft] = React.useState(
    [[1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]]
  );
  
  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on_left) {
      if (!lastRotationMatrixRef_left.current) {
        // First time trigger is pressed, store the initial rotation matrix
        lastRotationMatrixRef_left.current = [
          [...vr_controller_R_current_left[0]],
          [...vr_controller_R_current_left[1]],
          [...vr_controller_R_current_left[2]]
        ];

        const identity_matrix = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1]
        ];
        setVRControllerRmatrixRelativeLeft(identity_matrix);
        // console.log("Initial rotation matrix stored:", lastRotationMatrixRef.current);
      } else {

        const vr_controller_R_relative = mynp.calculateRelativeRotationMatrix(
          vr_controller_R_current_left,
          lastRotationMatrixRef_left.current,
          VR_Control_Mode
        );

        setVRControllerRmatrixRelativeLeft(vr_controller_R_relative);
        lastRotationMatrixRef_left.current = [
          [...vr_controller_R_current_left[0]],
          [...vr_controller_R_current_left[1]],
          [...vr_controller_R_current_left[2]]
        ];
      }
    }
  }, [
    controller_object_left.quaternion.x,
    controller_object_left.quaternion.y,
    controller_object_left.quaternion.z,
    controller_object_left.quaternion.w,
    rendered, 
    trigger_on_left,
    vrModeRef.current
  ]);

  // Reset as when trigger is released
  React.useEffect(() => {
    if (rendered && vrModeRef.current && !trigger_on_left && lastVRPosRef_left.current) {
      lastVRPosRef_left.current = null;
      lastRotationMatrixRef_left.current = null;
      setVRControllerPosDiffLeft([0, 0, 0]);
      setVRControllerRmatrixRelativeLeft(
        [[1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]]
      );
    }
  }, [trigger_on_left, rendered, vrModeRef.current]);

  /*---------------------------- Left Arm Control ----------------------------------------*/
  React.useEffect(() => {
    if (rendered && vrModeRef.current && trigger_on_left) {
      const currentP_left = [...position_ee_left];
      const currentR_left = [...R_ee_left];

      // Calculate the new position and orientation based on VR controller input
      const [p_v_left, p_theta_left] = mr.AxisAng3(vr_controller_p_diff_left);
      const p_scale = 1.0; // Scale factor for position movement

      const newP = [
        currentP_left[0] + p_v_left[0] * p_theta_left * p_scale, // Scale factor for position
        currentP_left[1] + p_v_left[1] * p_theta_left * p_scale,
        currentP_left[2] + p_v_left[2] * p_theta_left * p_scale
      ];

      const R_scale = 1.0
      const [R_screw_left, R_theta_left] = mynp.relativeRMatrixtoScrewAxis(vr_controller_R_relative_left);
      const R_relative_left = mynp.ScrewAxisToRelativeRMatrix(R_screw_left, R_theta_left * R_scale); // Scale factor for rotation

      // Calculate the new orientation based on the relative rotation matrix
      let newT;
      if (VR_Control_Mode === 'inSpace') {
        const newR_inSpace = mr.matDot(R_relative_left, currentR_left);
        newT = mr.RpToTrans(newR_inSpace, newP);
      }
      else if (VR_Control_Mode === 'inBody') {
        const newR_inBody = mr.matDot(currentR_left, R_relative_left);
        newT = mr.RpToTrans(newR_inBody, newP);
      }
      else {
        console.warn("Invalid VR Control Mode, choose 'inSpace' or 'inBody'. Current:", VR_Control_Mode);
        return;
      }

      // Update Joint Angles with IK
      const { new_theta_body, error_code } = IK_joint_velocity_limit(newT, robotParams.left, theta_body_left, VR_Control_Mode);
      setThetaBodyLeft(new_theta_body);
      setErrorCodeLeft(error_code);
    }
  }, [
    vr_controller_p_diff_left,
    vr_controller_R_relative_left,
    rendered, 
    trigger_on_left,
    vrModeRef.current
  ]);

  /*---------------------------- Left Arm Tool Control ----------------------------------------*/
  React.useEffect(() => {
    let intervalId = null;
    if (grip_on_left && button_x_on) {
      intervalId = setInterval(() => {
        setThetaToolLeft(prev => clampTool(prev + 0.5));
      }, 16.67); 
    }
    else if (grip_on_left && button_y_on) {
      intervalId = setInterval(() => {
        setThetaToolLeft(prev => clampTool(prev - 0.5));
      }, 16.67); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [ button_x_on, button_y_on, grip_on_left]);

  
  const thetaHistoryRef = React.useRef([]);
  const thetaLeftHistoryRef = React.useRef([]);

  React.useEffect(() => {
    if (!collision) {
      thetaHistoryRef.current.push(theta_body);
      thetaLeftHistoryRef.current.push(theta_body_left);

      if (thetaHistoryRef.current.length > 5) thetaHistoryRef.current.shift();
      if (thetaLeftHistoryRef.current.length > 5) thetaLeftHistoryRef.current.shift();
    } else if (collision) {
      if (thetaHistoryRef.current.length > 0 && thetaLeftHistoryRef.current.length > 0) {
        const last = thetaHistoryRef.current.pop();
        const lastLeft = thetaLeftHistoryRef.current.pop();

        setThetaBody(last);
        setThetaBodyLeft(lastLeft);

        console.warn("🔁 Return to last valid theta due to collision");
      }
    }
  }, [collision, theta_body, theta_body_left]);


  /* ------------------------- Web Controller Inputs -----------------------*/
  const controllerProps = React.useMemo(() => ({
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x,set_c_pos_x,c_pos_y,set_c_pos_y,c_pos_z,set_c_pos_z,
    c_deg_x,set_c_deg_x,c_deg_y,set_c_deg_y,c_deg_z,set_c_deg_z,
    vr_mode:vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    position_ee, setPositionEE,
    euler_ee, setEuler,
    // onTargetChange: KinematicsControl_joint_velocity_limit,
  }), [
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x,set_c_pos_x,c_pos_y,set_c_pos_y,c_pos_z,set_c_pos_z,
    c_deg_x,set_c_deg_x,c_deg_y,set_c_deg_y,c_deg_z,set_c_deg_z,
    vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    position_ee, setPositionEE,
    euler_ee, setEuler,
    // KinematicsControl_joint_velocity_limit,
  ]);

  /* ------------------------- VRController Inputs (Aframe Components) -----------------------*/
  React.useEffect(() => {
    registerAframeComponents({
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

      //Collision Check
      setCollision,

      // VR Camera Pose
      set_c_pos_x, set_c_pos_y, set_c_pos_z,
      set_c_deg_x, set_c_deg_y, set_c_deg_z,
      vrModeRef,
      props,
      onXRFrameMQTT,
    });
  }, []);

  /* ============================== MQTT Protocol ==========================================*/
  const thetaBodyMQTT = React.useRef(theta_body);
  React.useEffect(() => {
    thetaBodyMQTT.current = theta_body;
  }, [theta_body]);

  const thetaToolMQTT = React.useRef(theta_tool);
  React.useEffect(() => {
    thetaToolMQTT.current = theta_tool;
  }, [theta_tool]);

  React.useEffect(() => {
    window.requestAnimationFrame(onAnimationMQTT);
  }, []);
  
  // web MQTT
  const onAnimationMQTT = (time) =>{
    const robot_state_json = JSON.stringify({
      time: time,
      joints: thetaBodyMQTT.current,
      // grip: gripRef.current      
    });
    publishMQTT(MQTT_ROBOT_STATE_TOPIC + robotIDRef.current , robot_state_json); 
    // console.log("onAnimationMQTT published:", robot_state_json);
    window.requestAnimationFrame(onAnimationMQTT); 
  }

  // Publish: VR MQTT Control
  const receiveStateRef = React.useRef(true); // VR MQTT switch
  const onXRFrameMQTT = (time, frame) => {
    if (vrModeRef.current){
      frame.session.requestAnimationFrame(onXRFrameMQTT);
      setNow(performance.now()); 
    }
    if ((mqttclient != null) && receiveStateRef.current) {
      const ctl_json = JSON.stringify({
        time: time,
        joints: thetaBodyMQTT.current,
        tool: thetaToolMQTT.current
      });
      publishMQTT(MQTT_CTRL_TOPIC + robotIDRef.current, ctl_json);
    }
  }

  // Robot Request MQTT
  const requestRobot = (mqclient) => {
    const requestInfo = {
      devId: idtopic,
      type: codeType,
    }
    publishMQTT(MQTT_REQUEST_TOPIC, JSON.stringify(requestInfo));
  }

  // Update theta_body when robot_state is "initialize"
  const [theta_body_feedback, setThetaBodyFeedback] = React.useState([0, 0, 0, 0, 0, 0]);
  React.useEffect(() => {
    if (robot_state === "initialize") {
      setThetaBody(theta_body_feedback)
    }
  }, [robot_state]);

  useMqtt({
    props,
    requestRobot,
    thetaBodyMQTT: setThetaBody,
    thetaToolMQTT: setThetaTool,
    thetaBodyFeedback: setThetaBodyFeedback,
    robot_state: setRobotState,
    robotIDRef,
    MQTT_DEVICE_TOPIC, 
    MQTT_CTRL_TOPIC, 
    MQTT_ROBOT_STATE_TOPIC,
  });

  /* ============================= Robot State Update ==========================================*/
  // Robot State Update Props
  const robotProps = React.useMemo(() => ({
    robotNameList, robotName, theta_body, theta_tool, theta_body_left, theta_tool_left,
  }), [robotNameList, robotName, theta_body, theta_tool, theta_body_left, theta_tool_left]);
  
  // Robot Secene Render
  return (
    <>
      <RemoteWebcam 
        onVideoStream1={setWebcamStream1}
        onVideoStream2={setWebcamStream2} />
      <RobotScene
        robot_model={robot_model}
        rendered={rendered}

        robotProps={robotProps}
        controllerProps={controllerProps}
        dsp_message={dsp_message}
        c_pos_x={c_pos_x}
        c_pos_y={c_pos_y}
        c_pos_z={c_pos_z}
        c_deg_x={c_deg_x}
        c_deg_y={c_deg_y}
        c_deg_z={c_deg_z}
        viewer={props.viewer}
        monitor={props.monitor}

        // Right Arm
        state_codes={error_code}
        position_ee={position_ee_Three}
        euler_ee={euler_ee_Three}
        vr_controller_pos={vr_controller_pos}
        vr_controller_R={vr_controller_R_current}

        // Left Arm
        state_codes_left={error_code_left}
        position_ee_left={position_ee_Three_left}
        euler_ee_left={euler_ee_Three_left}
        vr_controller_pos_left={vr_controller_pos_left}
        vr_controller_R_left={vr_controller_R_current_left}
 
        modelOpacity={modelOpacity}
        webcamStream1={webcamStream1}
        webcamStream2={webcamStream2}
      />
    </>
  );
}
