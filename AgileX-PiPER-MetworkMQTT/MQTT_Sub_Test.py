import paho.mqtt.client as mqtt

topic = "control/d14ad41a-e958-4875-8528-ee3b5ffb73d2-at15uir"

def on_connect(client, userdata, flags, rc):
    print("Connected with result code", rc)
    client.subscribe(topic)  # 订阅所有topic

def on_message(client, userdata, msg):
    print(f"Topic: {msg.topic} | Payload: {msg.payload.decode()}")

client = mqtt.Client(transport="websockets")
client.tls_set(cert_reqs=0)
client.on_connect = on_connect
client.on_message = on_message

client.connect("192.168.197.29", 8333, 60)
client.loop_forever()