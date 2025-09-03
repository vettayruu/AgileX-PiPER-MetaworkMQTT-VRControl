# Local MQTT Control

The robot can also be controlled via a local MQTT broker.

## 1. Install Mosquitto
Download Mosquitto from the official website:

```
https://mosquitto.org/download/
```

On Windows, Mosquitto is usually installed in:
```
C:\Program Files\mosquitto
```

## 2. Configure Mosquitto

Open `mosquitto.conf` in the installation folder and add the following settings:

**WebSocket (non-secure, ws):**
```
listener 9001
protocol websockets
```
This enables WebSocket connections on port 9001.

**Secure WebSocket (wss):**

First, generate `.pem` certificates.

Then add the following lines to `mosquitto.conf`:

```
listener 8333
protocol websockets
certfile C:\Program Files\mosquitto\cert.pem
keyfile C:\Program Files\mosquitto\key.pem
allow_anonymous true
```

Port numbers (e.g., 9001, 8333) can be customized.

## 3. Verify the MQTT Broker

**Find your server address:**
On Windows, run `ipconfig` in the terminal, find something like

```
IPv4 Address. . . . . . . . . . . : 192.168.197.29
```

Use this IP together with your MQTT port. For example:

```
192.168.197.29:9001   (for ws)
192.168.197.29:8333   (for wss)
```

⚠️ **Important!!!**
Verify the MQTT Port before MQTT communication. 
To verify, open your browser and go to your MQTT port. For example:

```
https://192.168.197.29:8333
```

## 4. Start the MQTT Broker

After verifying, you can use your local MQTT server for communication in your local network.

**Run Mosquitto as Administrator:**

```
cd "C:\Program Files\mosquitto"
mosquitto -v
```
