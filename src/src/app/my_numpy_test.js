const mynp = require('../modern_robotics/my_numpy.js');

// 测试用例 2: 复杂旋转验证
// const testComplexRotation = () => {
//   console.log("=== 测试复杂旋转矩阵 ===");
  
//   // 初始旋转矩阵 (绕 X 轴旋转 45°)
//   const cos45 = Math.cos(Math.PI / 4);
//   const sin45 = Math.sin(Math.PI / 4);
  
//   const R_initial = [
//     [1,     0,      0    ],
//     [0,  cos45, -sin45  ],
//     [0,  sin45,  cos45  ]
//   ];

//   // 当前旋转矩阵 (绕 X 轴旋转 45°，然后绕 Z 轴旋转 90°)
//   const R_current = [
//     [0,    -cos45,  sin45],
//     [1,        0,      0 ],
//     [0,     sin45,  cos45]
//   ];

//   console.log("初始旋转矩阵 R_initial (绕X轴45°):");
//   console.table(R_initial.map(row => row.map(val => val.toFixed(3))));
//   console.log("当前旋转矩阵 R_current (X轴45° + Z轴90°):");
//   console.table(R_current.map(row => row.map(val => val.toFixed(3))));

//   // 测试 inSpace 模式
//   const R_relative_inSpace = mynp.calculateRelativeRotationMatrix(
//     R_current, 
//     R_initial, 
//     'inSpace'
//   );

//   // 测试 inBody 模式  
//   const R_relative_inBody = mynp.calculateRelativeRotationMatrix(
//     R_current, 
//     R_initial, 
//     'inBody'
//   );

//   console.log("相对旋转矩阵 (inSpace):");
//   console.table(R_relative_inSpace.map(row => row.map(val => val.toFixed(3))));
//   console.log("相对旋转矩阵 (inBody):");
//   console.table(R_relative_inBody.map(row => row.map(val => val.toFixed(3))));

//   // 预期结果验证
//   console.log("=== 理论验证 ===");
//   console.log("inSpace: R_current * R_initial^T");
//   console.log("inBody:  R_initial^T * R_current");
//   console.log("两者应该不同 (因为初始矩阵不是单位矩阵)");
// };

// testComplexRotation();

// const axis_body = [0, 0.70710678, 0.70710678]
// const theta = 1.5707963267948966
// const R_relative = mynp.ScrewAxisToRelativeRMatrix(axis_body, theta);
// console.log("相对旋转矩阵 R_relative:");
// console.table(R_relative.map(row => row.map(val => val.toFixed(3))));