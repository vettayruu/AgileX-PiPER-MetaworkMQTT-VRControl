import time
from math import radians

from pymycobot.mycobot280 import MyCobot280  # import mycobot library,if don't have, first 'pip install pymycobot'

# use PC and M5 control
mc = MyCobot280('COM5', 115200)  # WINDOWS use ，need check port number when you PC
# mc = MyCobot('/dev/ttyUSB0',115200)           # VM linux use
time.sleep(0.5)
print(mc)

# mc.power_off()
power = mc.is_power_on()
print(power)
#
angles = mc.get_angles()
print(angles)

# Set interpolation mode
mc.set_fresh_mode(1)
time.sleep(0.5)
# # Send the initial point angle of the robot arm, the speed is 50,
# # it can be customized and modified, as long as the end is facing down

# work point 1
mc.send_angles([0, 45, -100, 0, 0, 0], 30)
time.sleep(0.5)

# work point 2
# mc.send_angles([18.0, -22.5, -123, 128, -20, 5.5], 30)
# time.sleep(0.5)

# zero point
# mc.send_angles([0, 0, 0, 0, 0, 0], 30)

# mc.send_angles([0, 45, -75, -20, 0, 0], 10)

# [-0.17, -114.78, 122.6, 15.29, 0.52, -0.52]
time.sleep(3)
angles = mc.get_angles()
print(angles)