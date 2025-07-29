"use client";
import 'aframe'
import * as React from 'react'
import RemoteWebcam from './remote_webcam';
import RobotScene from './RobotScene';

import registerAframeComponents from './registerAframeComponents'; 
import useMqtt from './useMqtt';
import { mqttclient, idtopic, publishMQTT, subscribeMQTT, codeType } from '../lib/MetaworkMQTT'

const THREE = window.AFRAME.THREE;
const mr = require('../modern_robotics/modern_robotics_core.js');
const mynp = require('../modern_robotics/my_numpy.js');
// const RobotKinematics = require('../modern_robotics/modern_robotics_Kinematics.js');
const RobotDynamcis = require('../modern_robotics/modern_robotics_Dynamics.js');

// Load Robot Model
const robot_model = "agilex_piper"; // Change this to your robot model: jaka_zu_5, agilex_piper
const rk = new RobotDynamcis(robot_model);
const M = rk.get_M();
const Mlist = rk.get_Mlist();
const Glist = rk.get_Glist();
const Slist = rk.get_Slist();
const Kplist = rk.get_Kplist(); 
const Kilist = rk.get_Kilist(); 
const Kdlist = rk.get_Kdlist(); 
const jointLimits = rk.jointLimits;
const toolLimit = rk.toolLimit;
const Blist = mr.SlistToBlist(M, Slist); // Convert Slist to Blist

const Euler_order = 'ZYX'; // Euler angle order
const VR_Control_Mode = 'inBody'; // VR control mode: 'inSpace' or 'inBody'

const dt = 16.67/1000; // VR input period in seconds (60Hz)

// MQTT Topics
const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/" + idtopic;
const MQTT_CTRL_TOPIC = "control/"; 
const MQTT_ROBOT_STATE_TOPIC = "robot/";

export default function DynamicHome(props) {
  const [now, setNow] = React.useState(new Date())
  const [rendered,set_rendered] = React.useState(false)
  const robotNameList = ["Model"]
  const [robotName,set_robotName] = React.useState(robotNameList[0])

  const STATE_CODES = {
    NORMAL: 0x00,           // 正常状态
    IK_FAILED: 0x01,        // IK 求解失败
    VELOCITY_LIMIT: 0x02,   // 达到速度上限
    JOINT_LIMIT: 0x03,      // 关节限制
  };
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


  /*** Robot Controller ***/
  const [robotState, setRobotState] = React.useState(null);

  const [theta_body_initial, setThetaBodyInitial] = React.useState([0, -0.27473, 1.44144, 0, 1.22586, 0]);
  const [theta_body, setThetaBody] = React.useState(theta_body_initial);

  const [theta_body_initial_left, setThetaBodyInitialLeft] = React.useState([0, -0.27473, 1.44144, 0, 1.22586, 0]);
  const [theta_body_left, setThetaBodyLeft] = React.useState(theta_body_initial_left);

  React.useEffect(() => {
    console.log("theta_body_right updated:", theta_body);
  }, [theta_body]);

  React.useEffect(() => {
    console.log("theta_body_left updated:", theta_body_left);
  }, [theta_body_left]);

  const theta_tool_inital = 0;
  const [theta_tool, setThetaTool] = React.useState(theta_tool_inital);

  const theta_tool_inital_left = 0;
  const [theta_tool_left, setThetaToolLeft] = React.useState(theta_tool_inital_left);

  // Theta guess for Newton's method in inverse kinematics
  const [theta_body_guess, setThetaBodyGuess] = React.useState(theta_body);
  const [theta_body_guess_left, setThetaBodyGuessLeft] = React.useState(theta_body_left);

  /*** Dynamics VR Animation ***/
  const [qHistQueue, setQHistQueue] = React.useState([]);
  const animatingRef = React.useRef(false);
  React.useEffect(() => {
    if (animatingRef.current) return;
    if (qHistQueue.length === 0) return;
    animatingRef.current = true;
    const q_hist = qHistQueue[0];
    let idx = 0;
    function animate() {
      if (!q_hist) return;
      if (idx < q_hist.length) {
        setThetaBody(q_hist[idx]);
        idx += 1;
        // console.log('setThetaBody:', idx, q_hist.length, q_hist[idx]);
        setTimeout(animate, 1); 
      } else {
        setThetaBodyGuess(q_hist[q_hist.length - 1]);
        animatingRef.current = false;
        setQHistQueue(queue => queue.slice(1));
      }
    }
    animate();
  }, [qHistQueue]);

  /* ---------------- Robot right ---------------------------------------*/
  // Foward Kinematics solution
  const T0 = mr.FKinBody(M, Blist, theta_body);
  const [R0, p0] = mr.TransToRp(T0);

  // Position and orientation (euler angle) of end effector
  const position_ee_initial = p0
  const [position_ee, setPositionEE] = React.useState(position_ee_initial);

  const R_ee_initial = R0; // Initial rotation matrix of end effector
  const [R_ee, setREE] = React.useState(R_ee_initial);

  const position_ee_Three = mr.worlr2three(position_ee);

  const euler_ee_initial = mr.RotMatToEuler(R0, Euler_order); 
  const [euler_ee, setEuler] = React.useState(euler_ee_initial);
  const euler_ee_Three = mr.worlr2three(euler_ee);

  // Update end effector position and orientation (for webcontroller)
  React.useEffect(() => {
    const T = mr.FKinBody(M, Blist, theta_body);
    const [R, p] = mr.TransToRp(T);
    setPositionEE(p);
    setEuler(mr.RotMatToEuler(R, Euler_order)); // Update to ZYX Euler angles
    setREE(R);
    }, [theta_body]);
  
  /* ---------------- Robot Left ---------------------------------------*/
  const T0_left = mr.FKinBody(M, Blist, theta_body_left);
  const [R0_left, p0_left] = mr.TransToRp(T0_left);

  // Position and orientation (euler angle) of end effector
  const position_ee_initial_left = p0_left
  const [position_ee_left, setPositionEELeft] = React.useState(position_ee_initial_left);

  const R_ee_initial_left = R0_left; // Initial rotation matrix of end effector
  const [R_ee_left, setREELeft] = React.useState(R_ee_initial_left);

  const position_ee_Three_left = mr.worlr2three(position_ee_left);

  const euler_ee_initial_left = mr.RotMatToEuler(R0_left, Euler_order); 
  const [euler_ee_left, setEulerLeft] = React.useState(euler_ee_initial_left);
  const euler_ee_Three_left = mr.worlr2three(euler_ee_left);

  // Update end effector position and orientation (for webcontroller)
  React.useEffect(() => {
    const T_left = mr.FKinBody(M, Blist, theta_body_left);
    const [R_left, p_left] = mr.TransToRp(T_left);
    setPositionEELeft(p_left);
    setEulerLeft(mr.RotMatToEuler(R_left, Euler_order)); // Update to ZYX Euler angles
    setREELeft(R_left);
    }, [theta_body_left]);
  
  /**
   *  Control Methods
   * /
   * 
  /** Kinamatics Control **/
  function KinematicsControl_joint_velocity_limit(T_sd) {
    let thetalist_sol, ik_success;
    const max_joint_velocity = 5.5; // Maximum joint velocity limit

    if (VR_Control_Mode === 'inBody') {
      [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);
    } 
    else if (VR_Control_Mode === 'inSpace') {
      [thetalist_sol, ik_success] = mr.IKinSpace(Slist, M, T_sd, theta_body_guess, 1e-5, 1e-5);
    }
    // console.log("IK Solution:", thetalist_sol, "Success:", ik_success);

    if (ik_success) {
      const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
      );

      const delta_theta_body = thetalist_sol_limited.map((theta, i) => theta - theta_body[i]);
      const d_theta_body = delta_theta_body.map((val) => val / dt);
      // console.log("Velocity Theta Body:", d_theta_body);

      const [joint_ometahat, joint_theta] = mr.AxisAng3(d_theta_body);
      // console.log("Joint Ometahat:", joint_ometahat, "Joint Theta:", joint_theta);

      const joint_theta_limited = Math.max(0, Math.min(max_joint_velocity, joint_theta));

      const new_theta_body = theta_body.map((theta, i) => theta + joint_ometahat[i] * joint_theta_limited * dt);

      setThetaBody(new_theta_body);
      setThetaBodyGuess(new_theta_body);
      setErrorCode(STATE_CODES.NORMAL);

      if (joint_theta_limited == max_joint_velocity) {
        setErrorCode(STATE_CODES.VELOCITY_LIMIT);
      } 
    }
    else if (!ik_success) {
        console.warn("Right IK failed to converge");
        setErrorCode(STATE_CODES.IK_FAILED);
      } 
  }

  function KinematicsControl_joint_velocity_limit_left(T_sd) {
    let thetalist_sol, ik_success;
    const max_joint_velocity = 5.5; // Maximum joint velocity limit

    if (VR_Control_Mode === 'inBody') {
      [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess_left, 1e-5, 1e-5);
    } 
    else if (VR_Control_Mode === 'inSpace') {
      [thetalist_sol, ik_success] = mr.IKinSpace(Slist, M, T_sd, theta_body_guess_left, 1e-5, 1e-5);
    }
    // console.log("IK Solution:", thetalist_sol, "Success:", ik_success);

    if (ik_success) {
      const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
      );

      const delta_theta_body = thetalist_sol_limited.map((theta, i) => theta - theta_body_left[i]);
      const d_theta_body = delta_theta_body.map((val) => val / dt);
      // console.log("Velocity Theta Body:", d_theta_body);

      const [joint_ometahat, joint_theta] = mr.AxisAng3(d_theta_body);
      // console.log("Joint Ometahat:", joint_ometahat, "Joint Theta:", joint_theta);

      const joint_theta_limited = Math.max(0, Math.min(max_joint_velocity, joint_theta));

      const new_theta_body = theta_body_left.map((theta, i) => theta + joint_ometahat[i] * joint_theta_limited * dt);

      setThetaBodyLeft(new_theta_body);
      setThetaBodyGuessLeft(new_theta_body);
      setErrorCodeLeft(STATE_CODES.NORMAL);

      if (joint_theta_limited == max_joint_velocity) {
        setErrorCodeLeft(STATE_CODES.VELOCITY_LIMIT);
      } 
    }
    else if (!ik_success) {
      console.warn("Left IK failed to converge");
      setErrorCodeLeft(STATE_CODES.IK_FAILED);
    }
  }

  /** Dynamics Control **/
  function DynamicsControl(newPos, newEuler) {
    const T_sd = mr.RpToTrans(mr.EulerToRotMat(newEuler, Euler_order), newPos);
    const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);

    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
      );

    const dt = 0.01;
    const steps = 200;

    const q0 = theta_body.slice();
    const dq0 = Array(q0.length).fill(0);

    const q_ref = thetalist_sol_limited.slice();
    const dq_ref = Array(q0.length).fill(0);
    
    const [q_hist, dq_hist] = mr.simulate_PIDcontrol(q0, dq0, q_ref, dq_ref, dt, steps, Mlist, Glist, Slist, Kplist, Kilist, Kdlist)

    if (ik_success) {
      setQHistQueue(queue => [...queue, q_hist]); 
    } 
    else {
      console.warn("IK failed to converge");
    }
  }

  /*============================= VR Robot Control ==========================================*/
  // Update VR controller position and rotation matrix
  // !! Do not use Euler angle, since it can cause gimbal lock !!
  /**
   * VR Controller Relative Rotation Matrix Update
   * @param {Array<number>} controller_object.quaternion // controller quaternion in 3D space
   * @returns {Array<number>} vr_controller_R_relative   // Return the relative Rotation Matrix of the VR controller
   */

  function getVRControllerRotationMatrix(vr_controller_quat, VR_Control_Mode) {
    // Current VR controller quaternion
    // const vr_controller_quat = controller_object.quaternion;
    
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
    const vr_controller_R_current = [
      [elements[0], elements[4], elements[8]],
      [elements[1], elements[5], elements[9]],
      [elements[2], elements[6], elements[10]]
    ];
    return vr_controller_R_current;
  }

  /*-----------------------Right Arm Control---------------------------------------*/
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
  const vr_controller_R_current = getVRControllerRotationMatrix(controller_object.quaternion, VR_Control_Mode);

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
    }
  }, [trigger_on, rendered, vrModeRef.current]);

  // Output: vr_controller_p_diff and vr_controller_R_relative
  // console.log("VR Controller Position Diff:", vr_controller_p_diff);
  // console.log("VR Controller Relative Rotation Matrix:", vr_controller_R_relative);

  /*============================= Right Robot Control ==========================================*/
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

      // console.log("vr_controller_R_relative:", vr_controller_R_relative);
      // console.log("R_screw:", R_screw);
      // console.log("R_theta:", R_theta);

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
      KinematicsControl_joint_velocity_limit(newT);
    }
  }, [
    vr_controller_p_diff,
    vr_controller_R_relative,
    rendered, 
    trigger_on,
    vrModeRef.current
  ]);

  // Tool Control 
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

  // Update theta_body when robotState is "initialize"
  const [theta_body_feedback, setThetaBodyFeedback] = React.useState(theta_body_initial);
  React.useEffect(() => {
    if (robotState === "initialize") {
      setThetaBody(theta_body_feedback)
    }
  }, [robotState]);


  /*-----------------------Left Arm Control---------------------------------------*/
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
        console.log("VR Controller Position Diff:", pos_diff_world_left);

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
  const vr_controller_R_current_left = getVRControllerRotationMatrix(controller_object_left.quaternion, VR_Control_Mode);

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
    }
  }, [trigger_on_left, rendered, vrModeRef.current]);

  /*============================= Right Robot Control ==========================================*/
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

      // console.log("vr_controller_R_relative:", vr_controller_R_relative);
      // console.log("R_screw:", R_screw);
      // console.log("R_theta:", R_theta);

      // Calculate the new orientation based on the relative rotation matrix
      let newT_left;
      if (VR_Control_Mode === 'inSpace') {
        const newR_inSpace = mr.matDot(R_relative_left, currentR_left);
        newT_left = mr.RpToTrans(newR_inSpace, newP);
      }
      else if (VR_Control_Mode === 'inBody') {
        const newR_inBody = mr.matDot(currentR_left, R_relative_left);
        newT_left = mr.RpToTrans(newR_inBody, newP);
      }
      else {
        console.warn("Invalid VR Control Mode, choose 'inSpace' or 'inBody'. Current:", VR_Control_Mode);
        return;
      }
      KinematicsControl_joint_velocity_limit_left(newT_left);
    }
  }, [
    vr_controller_p_diff_left,
    vr_controller_R_relative_left,
    rendered, 
    trigger_on_left,
    vrModeRef.current
  ]);

  // Tool Control 
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

  /* ============================== MQTT Protocal ==========================================*/
  // webController Inputs
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
    // onTargetChange: KinematicsControl,
    onTargetChange: DynamicsControl
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
    // KinematicsControl,
    DynamicsControl
  ]);

  // VRController Inputs (Aframe Components)
  React.useEffect(() => {
    registerAframeComponents({
      set_rendered,
      robotChange,
      // Right Controller
      controller_object,
      set_controller_object,
      set_trigger_on,
      set_grip_on,
      set_button_a_on,
      set_button_b_on,
      // Left Controller
      controller_object_left,
      set_controller_object_left,
      set_trigger_on_left,
      set_grip_on_left,
      set_button_x_on,
      set_button_y_on,

      set_c_pos_x, set_c_pos_y, set_c_pos_z,
      set_c_deg_x, set_c_deg_y, set_c_deg_z,
      vrModeRef,
      Euler_order,
      props,
      onXRFrameMQTT,
    });
  }, []);

  /* 
  * MQTT 
  */
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

  useMqtt({
    props,
    requestRobot,
    thetaBodyMQTT: setThetaBody,
    thetaToolMQTT: setThetaTool,
    thetaBodyFeedback: setThetaBodyFeedback,
    robotState: setRobotState,
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
        state_codes={error_code}
        state_codes_left={error_code_left}

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

        position_ee={position_ee_Three}
        euler_ee={euler_ee_Three}
        vr_controller_pos={vr_controller_pos}
        vr_controller_R={vr_controller_R_current}

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
