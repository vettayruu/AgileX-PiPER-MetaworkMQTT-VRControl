import sys
import time
import numpy as np
import multiprocessing.shared_memory as sm

from piper_sdk import *
from MQTT_Recv import MQTT_Recv

import modern_robotics as mr

# To run the code, activate can bus at first:
# bash can_activate.sh can0 1000000

def enable_fun(piper: C_PiperInterface_V2):
    '''
    使能机械臂并检测使能状态,尝试5s,如果使能超时则退出程序
    '''
    enable_flag = False
    # 设置超时时间（秒）
    timeout = 5
    # 记录进入循环前的时间
    start_time = time.time()
    elapsed_time_flag = False
    while not (enable_flag):
        elapsed_time = time.time() - start_time
        print("--------------------")
        enable_flag = piper.GetArmLowSpdInfoMsgs().motor_1.foc_status.driver_enable_status and \
                      piper.GetArmLowSpdInfoMsgs().motor_2.foc_status.driver_enable_status and \
                      piper.GetArmLowSpdInfoMsgs().motor_3.foc_status.driver_enable_status and \
                      piper.GetArmLowSpdInfoMsgs().motor_4.foc_status.driver_enable_status and \
                      piper.GetArmLowSpdInfoMsgs().motor_5.foc_status.driver_enable_status and \
                      piper.GetArmLowSpdInfoMsgs().motor_6.foc_status.driver_enable_status
        print("使能状态:", enable_flag)
        piper.EnableArm(7)
        piper.GripperCtrl(0, 1000, 0x01, 0)
        print("--------------------")
        # 检查是否超过超时时间
        if elapsed_time > timeout:
            print("超时....")
            elapsed_time_flag = True
            enable_flag = True
            break
        time.sleep(1)
        pass
    if (elapsed_time_flag):
        print("程序自动使能超时,退出程序")
        exit(0)

# Create Shared Memory
try:
    shm = sm.SharedMemory("PiPER", create=True, size=16*4)
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    arr[:] = 0
    print("Shared memory PiPER created.")
except FileExistsError:
    shm = sm.SharedMemory("PiPER")
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    print("Shared memory PiPER already exists.")

if __name__ == "__main__":
    # initialize piper robot
    piper = C_PiperInterface_V2("can0")
    piper.ConnectPort()
    piper.EnableArm(7)
    enable_fun(piper=piper)
    # piper.DisableArm(7)
    piper.GripperCtrl(0, 1000, 0x01, 0)
    factor = 57295.7795  # joint motor signal: 1000*180/3.1415926, rad as input and degree*1000 as control signal

    # initialize shared memory
    recv = MQTT_Recv()
    thetaBody_initial = np.array([0,-0.27473,1.44144,0,1.22586,0])
    arr[8:14] = thetaBody_initial # Initial joint angles
    arr[15] = 0.0  # Initial tool angle
    print("Shared memory PiPER created and initialized.")

    theta_prev = arr[8:14].astype(float)
    dt = 0.005
    Tf = 0.05
    N = int(Tf / dt)
    method = 5

    try:
        recv.run_proc()
        shm = recv.get_shm_object()
        print("shared memory name：", shm.name)
        time.sleep(0.1)
        while True:
            # Update joint message
            arr = recv.get_shared_memory()
            theta_target = arr[8:14].astype(float)  # 6Dof robot
            thetaTool = arr[15].astype(float)
            # print("thetaBody memory：", thetaBody)
            # print("thetaTool memory：", thetaTool)

            if theta_prev != theta_target:
                theta_traj = mr.JointTrajectory(theta_prev, theta_target, Tf, N, method)

                for theta in theta_traj:
                    joint_1 = round(theta[0] * factor)
                    joint_2 = round((theta[1] + np.radians(90)) * factor)
                    joint_3 = round((theta[2] - np.radians(169.997)) * factor)
                    joint_4 = round(theta[3] * factor)
                    joint_5 = round((theta[4] - 0.03) * factor)
                    joint_6 = round(theta[5] * factor)

                    piper.MotionCtrl_2(0x01, 0x01, 60, 0x00)
                    piper.JointCtrl(joint_1, joint_2, joint_3, joint_4, joint_5, joint_6)

                    time.sleep(dt)
                theta_prev = theta_traj[-1]

            time.sleep(Tf)
            # finger_pos = (((thetaTool) * 0.6) / 1000) + 0.0004
            # joint_tool = round(finger_pos * 1000 * 1000)
            # piper.GripperCtrl(abs(joint_tool), 1000, 0x01, 0)

    except KeyboardInterrupt:
        print("MQTT Recv Stopped")
        sys.exit(0)
    except Exception as e:
        print("MQTT Recv Error:", e)
        sys.exit(1)
