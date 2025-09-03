import paho.mqtt.client as mqtt
import time

broker = "192.168.197.29"  # 不要加 wss://
port = 8333
topic = "test/ws"
topic2 = "test/ws2"

client = mqtt.Client(transport="websockets")

# 如果用自签名证书，跳过校验（仅测试用）
client.tls_set(cert_reqs=0)

client.connect(broker, port, 60)

client.loop_start()  # 启动网络循环

while True:
    client.publish(topic, "Hello World")
    client.publish(topic2, "Hello World")
    time.sleep(1)