import React from 'react';

// Robot Params
const rad2deg = rad => rad * 180 / Math.PI;

// Agilex Piper Model
// const Model = (props) => {
//   const L_01 = 0.123, L_23 = 0.28503, L_34 = 0.25075, L_56 = 0.091, L_ee = 0.1358;
//   const W_34 = 0.0219;
//   const { theta_body = [0,0,0,0,0,0], theta_tool = 24 } = props;
//   const [theta1, theta2, theta3, theta4, theta5, theta6] = theta_body.map(rad2deg);

//   const finger_pos = (((theta_tool)*0.4) / 1000)+0.0004;

//   return (
//     <>
//       {/* Plane */}
//       <a-plane
//         position="0 0 0"
//         rotation="-90 0 0"
//         width="1.2"
//         height="1.2"
//         color="#e0e0e0"
//         opacity="0.5"
//         visible="false"
//       ></a-plane>

//       {/* Robot Base */}
//       <a-entity robot-click="" gltf-model="#base" position={'0 0 0'} visible="true">
//         {/* J1 */}
//         <a-entity j_id="1" gltf-model="#j1" position={'0 0 0'} rotation={`0 ${theta1-180} 0`}>
//           {/* J2 */}
//           <a-entity j_id="2" gltf-model="#j2" position={`0 ${L_01} 0`} rotation={`${theta2} 0 0`}>
//             {/* J3 */}
//             <a-entity j_id="3" gltf-model="#j3" position={`0 ${L_23} 0`} rotation={`${theta3} 0 0`}>
//               {/* J4 */}
//               <a-entity j_id="4" gltf-model="#j4" position={`0 ${L_34} -${W_34}`} rotation={`0 ${theta4} 0`}>
//                 {/* J5 */}
//                 <a-entity j_id="5" gltf-model="#j5" position={`0 0 0`} rotation={`${theta5-90} 0 0`}>
//                   {/* J6 */}
//                   <a-entity j_id="6" gltf-model="#j6" position={`0 0 0`} rotation={`0 0 ${theta6}`}>
//                     {/* Tool */}
//                       <a-entity gltf-model="#j6_1" position={`${finger_pos} 0 ${L_56+L_ee}`}></a-entity>
//                       <a-entity gltf-model="#j6_2" position={`${-finger_pos} 0 ${L_56+L_ee}`}></a-entity>
//                   </a-entity>
//                 </a-entity>
//               </a-entity>
//             </a-entity>
//           </a-entity>
//         </a-entity>
//       </a-entity>
//     </>
//   );
// }

// Jaka_ZU_5 Robot Params
// const Model = (props) => {
//   const { theta_body = [0,0,0,0,0,0], theta_tool = 24 } = props;
//   const [theta1, theta2, theta3, theta4, theta5, theta6] = theta_body.map(rad2deg);
//   const L_01 = 0.12015, L_23 = 0.43, L_34 = 0.3685, W_45 = 0.114, L_56 = 0.1135

//   return (
//     <>
//       {/* Plane */}
//       <a-plane
//         position="0 0 0"
//         rotation="-90 0 0"
//         width="1.2"
//         height="1.2"
//         color="#e0e0e0"
//         opacity="0.0"
//         visible="False"
//       ></a-plane>

//       {/* Robot Base */}
//       <a-entity robot-click="" gltf-model="#base" position={'0 0 0'} rotation={`0 -180 0`} visible="true">
//         {/* J1 */}
//         <a-entity j_id="1" gltf-model="#j1" position={'0 0 0'} rotation={`0 ${theta1-180} 0`}>
//           {/* J2 */}
//           <a-entity j_id="2" gltf-model="#j2" position={`0 ${L_01} 0`} rotation={`${-theta2} 0 0`}>
//             {/* J3 */}
//             <a-entity j_id="3" gltf-model="#j3" position={`0 ${L_23} 0`} rotation={`${-theta3} 0 0`}>
//               {/* J4 */}
//               <a-entity j_id="4" gltf-model="#j4" position={`0 ${L_34} 0`} rotation={`${-theta4} 0 0`}>
//                 {/* J5 */}
//                 <a-entity j_id="5" gltf-model="#j5" position={`${W_45} ${L_56} 0.0`} rotation={`0 ${theta5-90} 0 `}>
//                   {/* J6 */}
//                   <a-entity j_id="6" gltf-model="#j6" position={`0 0 0`} rotation={`0 0 ${theta6}`}>
//                     {/* Tool */}
//                       {/* <a-entity gltf-model="#j6_1" position={`${finger_pos} 0 ${L_56+L_ee}`}></a-entity>
//                       <a-entity gltf-model="#j6_2" position={`${-finger_pos} 0 ${L_56+L_ee}`}></a-entity> */}
//                       {/* <a-entity end-link position={`0 0 ${L_56+L_ee}`} rotation={`0 0 -90`}></a-entity> */}
//                   </a-entity>
//                 </a-entity>
//               </a-entity>
//             </a-entity>
//           </a-entity>
//         </a-entity>
//       </a-entity>
//     </>
//   );
// }

// const Select_Robot = (props)=>{
//   const {robotNameList, robotName, ...rotateProps} = props;
//   const visibletable = robotNameList.map(()=>false);
//   const findindex = robotNameList.findIndex((e)=>e===robotName);
//   if(findindex >= 0){
//     visibletable[findindex] = true;
//   }
//   return (<>
//     <Model visible={visibletable[0]} {...rotateProps}/>
//   </>);
// }

/* ======================== Double Arm ================================== */
const Piper = (props) => {
  const L_01 = 0.123, L_23 = 0.28503, L_34 = 0.25075, L_56 = 0.091, L_ee = 0.1358;
  const W_34 = 0.0219;
  const { 
    theta_body = [0,0,0,0,0,0], 
    theta_tool = 24, 
    position = "0 0 0",      // 新增：机器人位置
    rotation = "0 0 0",      // 新增：机器人旋转
    robotId = "robot1",      // 新增：机器人ID
    visible = true           // 新增：可见性
  } = props;
  
  const [theta1, theta2, theta3, theta4, theta5, theta6] = theta_body.map(rad2deg);
  const finger_pos = (((theta_tool)*0.4) / 1000)+0.0004;

  return (
    <>
      {/* 机器人整体容器 */}
      <a-entity 
        id={robotId}
        position={position}
        rotation={rotation}
        visible={visible}
      >
        {/* Plane - 每个机器人的底座平面 */}
        <a-plane
          position="0 0 0"
          rotation="-90 0 0"
          width="1.2"
          height="1.2"
          color="#e0e0e0"
          opacity="0.3"
          visible="false"
        ></a-plane>

        {/* Robot Base */}
        <a-entity robot-click="" id={`${robotId}_base`}  gltf-model={`#${robotId}_base`} position={'0 0 0'} visible="true"
          // joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_base' : 'agilex_piper_left_base'}`}
          >
          {/* J1 */}
          <a-entity j_id="1" id={`${robotId}_j1`} gltf-model={`#${robotId}_j1`} position={'0 0 0'} rotation={`0 ${theta1-180} 0`}
            // joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_j1' : 'agilex_piper_left_j1'}`}
            >
            {/* J2 */}
            <a-entity j_id="2" id={`${robotId}_j2`} gltf-model={`#${robotId}_j2`} position={`0 ${L_01} 0`} rotation={`${theta2} 0 0`}
              // joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_j2' : 'agilex_piper_left_j2'}`}
              >
              {/* J3 */}
              <a-entity j_id="3" id={`${robotId}_j3`} gltf-model={`#${robotId}_j3`} position={`0 ${L_23} 0`} rotation={`${theta3} 0 0`}
                // joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_j3' : 'agilex_piper_left_j3'}`}
                >
                {/* J4 */}
                <a-entity j_id="4" id={`${robotId}_j4`} gltf-model={`#${robotId}_j4`} position={`0 ${L_34} -${W_34}`} rotation={`0 ${theta4} 0`}
                  // joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_j4' : 'agilex_piper_left_j4'}`}
                  >
                  {/* J5 */}
                  <a-entity j_id="5" id={`${robotId}_j5`} gltf-model={`#${robotId}_j5`} position={`0 0 0`} rotation={`${theta5-90} 0 0`}
                    // joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_j5' : 'agilex_piper_left_j5'}`}
                    >
                    {/* J6 */}
                    <a-entity j_id="6" id={`${robotId}_j6`} gltf-model={`#${robotId}_j6`} position={`0 0 0`} rotation={`0 0 ${theta6}`}
                      joint-collision-check={`target: #${robotId === 'agilex_piper_left' ? 'agilex_piper_right_j6' : 'agilex_piper_left_j6'}`}
                      show-collision-box="xPad: 0.0; yPad: 0.03; zPad: 0.0; color: #ff00ff">
                      {/* Tool */}
                      <a-entity id={`${robotId}_j6_1`} gltf-model={`#${robotId}_j6_1`} position={`${finger_pos} 0 ${L_56+L_ee}`}></a-entity>
                      <a-entity id={`${robotId}_j6_2`} gltf-model={`#${robotId}_j6_2`} position={`${-finger_pos} 0 ${L_56+L_ee}`}></a-entity>
                    </a-entity>
                  </a-entity>
                </a-entity>
              </a-entity>
            </a-entity>
          </a-entity>
        </a-entity>
        
        {/* 机器人标签 */}
        {/* <a-text 
          value={robotId}
          position="0 0.7 0"
          rotation="0 0 0"
          color="white"
          align="center"
          scale="0.2 0.2 0.2"
        ></a-text> */}
      </a-entity>
    </>
  );
};

const MyCobot = (props) => {
  const { 
    theta_body = [0,0,0,0,0,0], 
    position = "0 0 0",      // 新增：机器人位置
    rotation = "0 0 0",      // 新增：机器人旋转
    robotId = "cam",      // 新增：机器人ID
    visible = true           // 新增：可见性
  } = props;
  
  const [theta1, theta2, theta3, theta4, theta5, theta6] = theta_body.map(rad2deg);

  return (
    <>
      {/* 机器人整体容器 */}
      <a-entity 
        id={robotId}
        position={position}
        rotation={rotation}
        visible={visible}
      >

        {/* Robot Base */}
        <a-entity robot-click="" id={`${robotId}_base`}  gltf-model={`#${robotId}_base`} position={'0 0 0'} rotation={`0 90 0`} 
          >
          {/* J1 */}
          <a-entity j_id="1" id={`${robotId}_j1`} gltf-model={`#${robotId}_j1`} position={'0 0.0706 0'} rotation={`0 ${theta1} 0`}
            >
            {/* J2 */}
            <a-entity j_id="2" id={`${robotId}_j2`} gltf-model={`#${robotId}_j2`} position={`0 0.06 0.03256`} rotation={`0 0 ${theta2}`}
              >
              {/* J3 */}
              <a-entity j_id="3" id={`${robotId}_j3`} gltf-model={`#${robotId}_j3`} position={`0 0.1104 0`} rotation={`0 0 ${theta3}`}
                >
                {/* J4 */}
                <a-entity j_id="4" id={`${robotId}_j4`} gltf-model={`#${robotId}_j4`} position={`0 +0.096 0`} rotation={`0 0 ${theta4}`}
                  >
                  {/* J5 */}
                  <a-entity j_id="5" id={`${robotId}_j5`} gltf-model={`#${robotId}_j5`} position={`0 0.0345 0.0335`} rotation={`0 ${theta5} 0`}
                    >
                    {/* J6 */}
                    <a-entity j_id="6" id={`${robotId}_j6`} gltf-model={`#${robotId}_j6`} position={`0.034 0.038 0`} rotation={`${theta6} 0 0`}
                    >
                      {/* Tool */}
                      <a-entity id={`${robotId}_cam_mount_1`} gltf-model={`#${robotId}_cam_mount_1`} position={`0.0135 0.001 0`}></a-entity>
                      <a-entity id={`${robotId}_cam_mount_2`} gltf-model={`#${robotId}_cam_mount_2`} position={`0.0135 0.024 0`}></a-entity>
                      <a-entity id={`${robotId}_cam`} gltf-model={`#${robotId}_cam`} position={`0.024 0.04 0`}></a-entity>
                    </a-entity>
                  </a-entity>
                </a-entity>
              </a-entity>
            </a-entity>
          </a-entity>
        </a-entity>
        
        {/* 机器人标签 */}
        {/* <a-text 
          value={robotId}
          position="0 0.7 0"
          rotation="0 0 0"
          color="white"
          align="center"
          scale="0.2 0.2 0.2"
        ></a-text> */}
      </a-entity>
    </>
  );
};

// 修改 Select_Robot 支持多机器人
const Select_Robot = (props) => {
  const {
    robotNameList, 
    robotName, 
    // robot right
    theta_body = [0,0,0,0,0,0], 
    theta_tool = 24,
    // robot left
    theta_body_left = [0,0,0,0,0,0],
    theta_tool_left = 24,
    // robot cam
    theta_body_cam = [0,0,0,0,0,0],
    // 其他props
    ...rotateProps
  } = props;
  // console.log("robotprops:", props);

  const visibletable = robotNameList.map(() => false);
  const findindex = robotNameList.findIndex((e) => e === robotName);
  if (findindex >= 0) {
    visibletable[findindex] = true;
  }

  return (
    <>
      <Piper 
        visible={visibletable[0]}
        theta_body={theta_body_left}
        theta_tool={theta_tool_left}
        position="-0.35 0 0"  
        rotation="0 0 0"
        robotId="left_arm"
        {...rotateProps}
      />
      
      <Piper 
        visible={visibletable[0]}
        theta_body={theta_body}
        theta_tool={theta_tool}
        position="0.35 0 0"   
        robotId="right_arm"
        {...rotateProps}
      />

      <MyCobot
        visible={visibletable[0]}
        theta_body={theta_body_cam}
        position="0 0.208 0.035"   
        robotId="cam"
        {...rotateProps}
      />
    </>
  );
};

/* ======================== Export ================================== */
export { Select_Robot };