from PIPERControl import PIPERControl
import time

if __name__ == "__main__":
    # Piper Initialize
    can_port = "can0"
    piper_interface = PIPERControl(can_port)
    piper_interface.connect()
    time.sleep(0.1)

    # piper_interface.right_arm_work_position()
    piper_interface.right_arm_initialize()