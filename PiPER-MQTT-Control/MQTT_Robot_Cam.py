import sys
import subprocess
import os
import atexit

import time
import numpy as np
import multiprocessing.shared_memory as sm

from MQTT_Recv_Cam import MQTT_Recv

import modern_robotics as mr
from pymycobot.mycobot280 import MyCobot280  # import mycobot library,if don't have, first 'pip install pymycobot'

# Create Shared Memory
try:
    shm = sm.SharedMemory("CAM", create=True, size=16*4)
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    arr[:] = 0
    print("Shared memory CAM created.")
except FileExistsError:
    shm = sm.SharedMemory("CAM")
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    print("Shared memory CAM already exists.")

def cleanup():
    if monitor_proc.poll() is None:  # 子进程还活着
        print("Terminating Monitor UI...")
        monitor_proc.terminate()     # 发送 SIGTERM
        try:
            monitor_proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            monitor_proc.kill()
            print("Monitor forcibly killed.")

if __name__ == "__main__":
    # Open Monitor
    monitor_script = os.path.join(os.getcwd(), "MQTT_Robot_Monitor_UI_Cam.py")
    monitor_proc = subprocess.Popen([sys.executable, monitor_script])
    print("Monitor UI launched.")

    def cleanup():
        if monitor_proc.poll() is None:
            print("Terminating Monitor UI...")
            monitor_proc.terminate()
            try:
                monitor_proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                monitor_proc.kill()

    atexit.register(cleanup)

    # initialize shared memory
    recv = MQTT_Recv()
    print("Shared memory PiPER created and initialized.")

    prev_error = np.zeros(6)

    try:
        recv.run_proc()
        shm = recv.get_shm_object()
        print("shared memory name：", shm.name)
        time.sleep(0.1)

        # use PC and M5 control
        # mc = MyCobot280('COM5', 115200)  # WINDOWS use ，need check port number when you PC
        mc = MyCobot280('/dev/ttyUSB0',115200)           # VM linux use
        mc.set_fresh_mode(1)
        time.sleep(0.5)
        print("Mycobot280 Info", mc)

        power = mc.is_power_on()

        # Update joint message
        arr = recv.get_shared_memory()
        thetaBody = arr[8:14].astype(float)  # 6Dof robot
        thetaTool = arr[15].astype(float)

        joint_feedback = mc.get_angles()
        joint_feedback = np.deg2rad(joint_feedback)  # 当前角度（rad）
        arr[0:6] = joint_feedback

        # Send robot current state to MQTT
        robot_state_msg = {
            "state_cam": "initialize",
            "model_cam": "myCobot280",
            "joint_feedback_cam": joint_feedback.tolist(),
        }
        recv.publish_message(robot_state_msg)
        time.sleep(1.0)

        a = arr[0:6]
        a = [round(x) for x in a]
        a = np.array(a)
        print("a:", a)

        b = arr[8:14]
        b = [round(x) for x in b]
        b = np.array(b)
        print("b:", b)

        equal = np.allclose(a, b)

        if equal:
            robot_state_msg = {
                "state": "ready",
            }
            recv.publish_message(robot_state_msg)
            print("Robot Ready.")
        else:
            print("Robot Not Ready. Please check VR control communication.")

        while equal:
            # Update joint message
            thetaBody = arr[8:14].astype(float)  # 6Dof robot

            """Control Directly"""
            joint_cmd = np.rad2deg(thetaBody)
            mc.send_angles(joint_cmd.tolist(), 30)
            # print("cmd", joint_cmd)
            time.sleep(0.033)

    except KeyboardInterrupt:
        print("MQTT Recv Stopped")
        robot_state_msg = {
            "state": "stop",
        }
        recv.publish_message(robot_state_msg)
        sys.exit(0)
    except Exception as e:
        print("MQTT Recv Error:", e)
        robot_state_msg = {
            "state": "error",
        }
        recv.publish_message(robot_state_msg)
        sys.exit(1)