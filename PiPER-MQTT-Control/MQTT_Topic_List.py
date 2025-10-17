import paho.mqtt.client as mqtt
from timeserver import TimeSyncWSS, TimeSyncWSSSync
import time

def on_connect(client, userdata, flags, rc):
    print("Connected with result code", rc)
    client.subscribe("#")  # 订阅所有topic

def on_message(client, userdata, msg):
    # timestamp = time_sync.get_server_time()
    # print("Time:", int(time.time()*1000) + 1275)
    print(f"Topic: {msg.topic} | Payload: {msg.payload.decode()}")
    # time.sleep(0.002)
    # print("Time:", time.time())

# time_sync = TimeSyncWSSSync("http://192.168.197.52/time")

client = mqtt.Client(transport="websockets")
client.tls_set(cert_reqs=0)
client.on_connect = on_connect
client.on_message = on_message

client.connect("192.168.197.42", 8333, 60)
client.loop_forever()