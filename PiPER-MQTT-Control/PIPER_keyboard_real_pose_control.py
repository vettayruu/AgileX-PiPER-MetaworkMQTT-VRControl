import time
import modern_robotics as mr
from pynput import keyboard
import numpy as np
from PIPERControl import PIPERControl
from ModernRoboticsIK import ModernRoboticsIK

np.set_printoptions(precision=4, suppress=True)

robot_model = 'piper_agilex'
piperik = ModernRoboticsIK(robot_model)
# mode = "inSpace"
mode = "inBody"

p_step = 0.001
R_step = 0.005

can_port = "can0"
piper_interface = PIPERControl(can_port)
piper_interface.connect()
time.sleep(0.1)

key_state = set()
def on_press(key):
    try:
        if key.char in ['w', 'a', 's', 'd', 'q', 'e', 'u', 'i', 'o', 'j', 'k', 'l', 'r', 'n', 'm']:
            key_state.add(key.char)
    except AttributeError:
        pass

def on_release(key):
    try:
        if key.char in key_state:
            key_state.remove(key.char)
    except AttributeError:
        pass
    if key == keyboard.Key.esc:
        return False  # stop listener

listener = keyboard.Listener(on_press=on_press, on_release=on_release)
listener.start()

print("位置控制: W/A/S/D/Q/E")
print("旋转控制: I/K (X轴), J/L (Y轴), U/O (Z轴)")

if __name__ == "__main__":
    # keyboard control
    try:
        while True:
            joint_position = piper_interface.get_joint_feedback_mr()
            T = piperik.fk(joint_position, mode)
            R, p = mr.TransToRp(T)
            yaw = pitch = roll = 0

            # position control
            if 'w' in key_state:
                p[0] += p_step
            elif 's' in key_state:
                p[0] -= p_step
            elif 'a' in key_state:
                p[1] += p_step
            elif 'd' in key_state:
                p[1] -= p_step
            elif 'e' in key_state:
                p[2] += p_step
            elif 'q' in key_state:
                p[2] -= p_step

            elif 'u' in key_state:
                yaw += R_step
            elif 'j' in key_state:
                yaw -= R_step
            elif 'i' in key_state:
                pitch += R_step
            elif 'k' in key_state:
                pitch -= R_step
            elif 'o' in key_state:
                roll += R_step
            elif 'l' in key_state:
                roll -= R_step

            elif 'r' in key_state:
                print("reset")
                time.sleep(0.5)
                continue

            R = piperik.z_axis_rotate(R, yaw, mode)
            R = piperik.y_axis_rotate(R, pitch, mode)
            R = piperik.x_axis_rotate(R, roll, mode)
            T_sd = mr.RpToTrans(R, p)
            thetaBody, status = piperik.IK_joint_velocity_limit(T_sd, joint_position, mode)
            print(thetaBody)

            piper_interface.joint_control_offset(thetaBody, 5)

            time.sleep(0.05)

    except KeyboardInterrupt:
        print("\n退出控制")
