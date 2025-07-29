/** Kinematics Control with Delta Theta Limiting **/
function KinematicsControl(T_sd) {
  const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);
  
  console.log("IK Solution:", thetalist_sol, "Success:", ik_success);
  
  if (ik_success) {
    // Apply joint limits
    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
    );
    
    // Calculate delta theta
    const delta_theta = thetalist_sol_limited.map((theta, i) => theta - theta_body[i]);
    
    // 限制每一帧的变化量
    const max_delta_per_frame = 0.02; // 每帧最大变化量 (弧度) - 可调节
    const limited_delta_theta = delta_theta.map(delta => {
      if (Math.abs(delta) > max_delta_per_frame) {
        return Math.sign(delta) * max_delta_per_frame;
      }
      return delta;
    });
    
    // Apply the limited delta theta
    const new_theta_body = theta_body.map((theta, i) => theta + limited_delta_theta[i]);
    
    console.log("Original Delta Theta:", delta_theta);
    console.log("Limited Delta Theta:", limited_delta_theta);
    console.log("Max Delta Applied:", Math.max(...limited_delta_theta.map(Math.abs)));
    
    setThetaBody(new_theta_body);
    setThetaBodyGuess(thetalist_sol_limited);
    set_target_error(false);
  } else {
    console.warn("IK failed to converge");
    set_target_error(true);
  }
}


/** Advanced Kinematics Control with Individual Joint Limits **/
function KinematicsControl(T_sd) {
  const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);
  
  if (ik_success) {
    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
    );
    
    const delta_theta = thetalist_sol_limited.map((theta, i) => theta - theta_body[i]);
    
    // 为不同关节设置不同的速度限制
    const max_delta_per_joint = [
      0.03,  // Joint 1 - 基座关节，可以稍快
      0.02,  // Joint 2 - 肩部关节
      0.02,  // Joint 3 - 肘部关节  
      0.04,  // Joint 4 - 腕关节1，可以较快
      0.04,  // Joint 5 - 腕关节2，可以较快
      0.05   // Joint 6 - 腕关节3，末端关节可以最快
    ];
    
    const limited_delta_theta = delta_theta.map((delta, i) => {
      const max_delta = max_delta_per_joint[i] || 0.02; // 默认值
      if (Math.abs(delta) > max_delta) {
        return Math.sign(delta) * max_delta;
      }
      return delta;
    });
    
    const new_theta_body = theta_body.map((theta, i) => theta + limited_delta_theta[i]);
    
    // 调试信息
    const max_applied_delta = Math.max(...limited_delta_theta.map(Math.abs));
    console.log("Joint Delta Limits Applied:", {
      original: delta_theta.map(d => d.toFixed(4)),
      limited: limited_delta_theta.map(d => d.toFixed(4)),
      max_applied: max_applied_delta.toFixed(4)
    });
    
    setThetaBody(new_theta_body);
    setThetaBodyGuess(thetalist_sol_limited);
    set_target_error(false);
  } else {
    console.warn("IK failed to converge");
    set_target_error(true);
  }
}


/** Velocity-Based Delta Theta Limiting **/

// 添加关节速度状态
const [joint_velocities, setJointVelocities] = React.useState([0, 0, 0, 0, 0, 0]);
const joint_velocities_ref = React.useRef([0, 0, 0, 0, 0, 0]);

React.useEffect(() => {
  joint_velocities_ref.current = joint_velocities;
}, [joint_velocities]);

function KinematicsControl(T_sd) {
  const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);
  
  if (ik_success) {
    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
    );
    
    const delta_theta = thetalist_sol_limited.map((theta, i) => theta - theta_body[i]);
    
    // 基于当前速度的动态限制
    const dt = 16.67 / 1000; // 假设60fps
    const max_joint_velocity = [2.0, 2.0, 2.0, 3.0, 3.0, 4.0]; // rad/s
    const acceleration_limit = [5.0, 5.0, 5.0, 8.0, 8.0, 10.0]; // rad/s²
    
    const limited_delta_theta = delta_theta.map((delta, i) => {
      // 计算期望速度
      const desired_velocity = delta / dt;
      const current_velocity = joint_velocities_ref.current[i];
      
      // 计算速度变化（加速度）
      const velocity_change = desired_velocity - current_velocity;
      const max_velocity_change = acceleration_limit[i] * dt;
      
      // 限制加速度
      const limited_velocity_change = Math.sign(velocity_change) * 
        Math.min(Math.abs(velocity_change), max_velocity_change);
      
      // 计算新速度
      const new_velocity = current_velocity + limited_velocity_change;
      
      // 限制最大速度
      const final_velocity = Math.sign(new_velocity) * 
        Math.min(Math.abs(new_velocity), max_joint_velocity[i]);
      
      // 返回限制后的位置变化
      return final_velocity * dt;
    });
    
    // 更新关节速度
    const new_velocities = limited_delta_theta.map(delta => delta / dt);
    setJointVelocities(new_velocities);
    
    const new_theta_body = theta_body.map((theta, i) => theta + limited_delta_theta[i]);
    
    // 调试信息
    console.log("Velocity-Limited Control:", {
      desired_deltas: delta_theta.map(d => d.toFixed(4)),
      limited_deltas: limited_delta_theta.map(d => d.toFixed(4)),
      velocities: new_velocities.map(v => v.toFixed(2))
    });
    
    setThetaBody(new_theta_body);
    setThetaBodyGuess(thetalist_sol_limited);
    set_target_error(false);
  } else {
    console.warn("IK failed to converge");
    set_target_error(true);
  }
}


/** Simple Global Delta Theta Limiting **/
function KinematicsControl(T_sd) {
  const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);
  
  if (ik_success) {
    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
    );
    
    const delta_theta = thetalist_sol_limited.map((theta, i) => theta - theta_body[i]);
    
    // 简单的全局限制
    const MAX_DELTA_PER_FRAME = 0.025; // 可以根据需要调节
    
    const limited_delta_theta = delta_theta.map(delta => {
      return Math.sign(delta) * Math.min(Math.abs(delta), MAX_DELTA_PER_FRAME);
    });
    
    const new_theta_body = theta_body.map((theta, i) => theta + limited_delta_theta[i]);
    
    setThetaBody(new_theta_body);
    setThetaBodyGuess(thetalist_sol_limited);
    set_target_error(false);
  } else {
    console.warn("IK failed to converge");
    set_target_error(true);
  }
}