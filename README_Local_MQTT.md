The robot can also controlled by local MQTT

Firstly, build local MQTT server by mosquitto

https://mosquitto.org/download/

In windows, mosquitto is installed in "C:\Program Files\mosquitto"

Find mosquitto.conf in the folder, and add 

listener 9001
protocol websockets

This can connect to port 9001 with ws.

To connect with wss, 

Firstly, create .pem certifications.

Then, add

listener 8333
protocol websockets
certfile C:\Program Files\mosquitto\cert.pem
keyfile C:\Program Files\mosquitto\key.pem
allow_anonymous true

Port numbers are custormized.

To start MQTT, run by administritor

cd "C:\Program Files\mosquitto"
mosquitto -v

Find your server address. 
In windows, run to show your PC addredd in the current network.

The certificate your MQTT port.

For example, the MQTT port address is 192.168.197.29:8333
Use broswer go the 192.168.197.29:8333 to certificate your MQTT port.

