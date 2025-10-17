import subprocess

# List your Python scripts
robot_cam_path = "MQTT_Robot_Cam.py"
robot_left_path = "MQTT_Robot_Feedback_PD_Traj_Left.py"
robot_right_path = "MQTT_Robot_Feedback_PD_Traj_Right.py"

scripts = [robot_cam_path, robot_left_path, robot_right_path]

processes = []

for script in scripts:
    # Start each script in a new process
    p = subprocess.Popen(["python3", script])
    processes.append(p)

# Wait for all to finish (optional)
for p in processes:
    p.wait()
