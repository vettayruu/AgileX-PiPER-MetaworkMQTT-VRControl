def MQTT_Server_Info(mode):
    if mode == "local":
        MQTT_SERVER = "192.168.197.42"
        Port = 8333
    elif mode == "uclab":
        MQTT_SERVER = "sora2.uclab.jp"
        Port = 1883
    USER_UUID = "d514aa76-a6cf-4718-9a8d-db69e330229e-liust" # VR
    # USER_UUID = "7f0639a9-1a03-46a7-adb6-61007efd5d6a-liust" # Browser
    return MQTT_SERVER, Port, USER_UUID