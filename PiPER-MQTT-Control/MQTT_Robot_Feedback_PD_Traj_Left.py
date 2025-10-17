import sys
import subprocess
import os
import atexit

import time
import numpy as np
import multiprocessing.shared_memory as sm

from MQTT_Recv_Left import MQTT_Recv
import modern_robotics as mr
from PIPERControl import PIPERControl

# To run the code, activate can bus at first:
# bash can_activate.sh can0 1000000

# Create Shared Memory
try:
    shm = sm.SharedMemory("PiPER-LEFT", create=True, size=16*4)
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    arr[:] = 0
    print("Shared memory PiPER-LEFT created.")
except FileExistsError:
    shm = sm.SharedMemory("PiPER-LEFT")
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    print("Shared memory PiPER-LEFT already exists.")

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
    monitor_script = os.path.join(os.getcwd(), "MQTT_Robot_Monitor_UI_Left.py")
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

    # initialize piper robot
    can_port = "can1"
    piper_interface = PIPERControl(can_port)
    piper_interface.connect()
    time.sleep(0.1)

    # initialize shared memory
    recv = MQTT_Recv()
    print("Shared memory PiPER created and initialized.")

    # Control Parameter
    Tf = 0.044
    dt = 0.002
    N = 22
    method = 5
    Kp = 0.75
    Kd = 0.0015

    prev_error = np.zeros(6)

    try:
        recv.run_proc()
        shm = recv.get_shm_object()
        print("shared memory name：", shm.name)
        time.sleep(0.1)

        # Update joint message
        arr = recv.get_shared_memory()
        thetaBody = arr[8:14].astype(float)  # 6Dof robot
        thetaTool = arr[15].astype(float)

        joint_feedback = piper_interface.get_joint_feedback_mr()
        joint_feedback = np.array(joint_feedback)  # 当前角度（rad）
        arr[0:6] = joint_feedback

        # Send robot current state to MQTT
        robot_state_msg = {
            "state_left": "initialize",
            "model_left": "agilex_piper",
            "joint_feedback_left": joint_feedback.tolist(),
        }
        recv.publish_message(robot_state_msg)
        time.sleep(1.5)

        print("shared memory:", arr)
        a = arr[0:6]
        b = arr[8:14]
        equal = np.allclose(a, b)

        if equal:
            robot_state_msg = {
                "state_left": "ready",
            }
            recv.publish_message(robot_state_msg)
            print("Robot Ready.")
        else:
            print("Robot Not Ready. Please check VR control communication.")

        while equal:
            # Update joint message
            thetaBody = arr[8:14].astype(float)  # 6Dof robot
            thetaBody = [round(x, 4) for x in thetaBody]
            thetaBody = np.array(thetaBody)

            thetaTool = arr[15].astype(float)

            # Get joint feedback
            joint_feedback = piper_interface.get_joint_feedback_mr()
            joint_feedback = [round(x, 4) for x in joint_feedback]
            joint_feedback = np.array(joint_feedback)  # 当前角度（rad）
            arr[0:6] = joint_feedback

            error = thetaBody - joint_feedback
            d_error = (error - prev_error) / Tf
            mse = np.mean(error ** 2)  # Mean Square Error
            rmse = np.sqrt(mse)

            # PD control
            control_signal = joint_feedback + Kp * error + Kd * d_error
            prev_error = error.copy()

            # Trajectory Plan
            theta_current = joint_feedback
            theta_target =control_signal
            if rmse > 0.002:
                theta_traj = mr.JointTrajectory(theta_current, theta_target, Tf, N, method)

                for theta in theta_traj:
                    # Transform to control signal (need calibration)
                    piper_interface.joint_control_offset(theta, 60)

                    finger_pos = ((thetaTool) * 0.85) + 0.4  # /mm
                    piper_interface.gripper_control(finger_pos, 1000)

                    time.sleep(dt)
            else:
                finger_pos = ((thetaTool) * 0.85) + 0.4  # /mm
                joint_tool = round(finger_pos * 1000 * 1000)
                piper_interface.gripper_control(finger_pos, 1000)
                time.sleep(dt)

    except KeyboardInterrupt:
        print("MQTT Recv Stopped")
        robot_state_msg = {
            "state_left": "stop",
        }
        recv.publish_message(robot_state_msg)
        sys.exit(0)
    except Exception as e:
        print("MQTT Recv Error:", e)
        robot_state_msg = {
            "state_left": "error",
        }
        recv.publish_message(robot_state_msg)
        sys.exit(1)