import time
from pynput import keyboard
import numpy as np
from PIPERControl import PIPERControl

np.set_printoptions(precision=4, suppress=True)

step = 0.005

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

try:
    while True:
        joint_position = piper_interface.get_joint_feedback()
        print("joint_position:", joint_position)

        # position control
        if 'q' in key_state:
            joint_position[0] += step
        elif 'a' in key_state:
            joint_position[0] -= step
        elif 'w' in key_state:
            joint_position[1] += step
        elif 's' in key_state:
            joint_position[1] -= step
        elif 'e' in key_state:
            joint_position[2] += step
        elif 'd' in key_state:
            joint_position[2] -= step
        elif 'u' in key_state:
            joint_position[3] += step
        elif 'j' in key_state:
            joint_position[3] -= step
        elif 'i' in key_state:
            joint_position[4] += step
        elif 'k' in key_state:
            joint_position[4] -= step
        elif 'o' in key_state:
            joint_position[5] += step
        elif 'l' in key_state:
            joint_position[5] -= step
        elif 'r' in key_state:
            print("reset")
            continue

        piper_interface.joint_control(joint_position, 5)

        time.sleep(0.05)

except KeyboardInterrupt:
    print("\n退出控制")
