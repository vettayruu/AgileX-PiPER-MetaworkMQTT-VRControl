import { useEffect } from 'react';
import { connectMQTT, mqttclient, idtopic, subscribeMQTT, publishMQTT, codeType } from '../lib/MetaworkMQTT'

export default function useMqtt({
  props,
  requestRobot,
  thetaBodyMQTT,
  thetaToolMQTT,
  thetaBodyFeedback,
  robotState,
  robotIDRef,
  MQTT_DEVICE_TOPIC,
  MQTT_CTRL_TOPIC,
  MQTT_ROBOT_STATE_TOPIC,
}) {
  useEffect(() => {
  // connect to MQTT broker  
  if (typeof window.mqttClient === 'undefined') {
    window.mqttClient = connectMQTT(requestRobot);
    window.mqttClient.on('connect', () => {
      subscribeMQTT(MQTT_DEVICE_TOPIC);
      subscribeMQTT(MQTT_CTRL_TOPIC + idtopic);
      subscribeMQTT(MQTT_ROBOT_STATE_TOPIC + idtopic);
    });
  }

  // define the joint handler for incoming messages
  const handler = (topic, message) => {
    let data;
    // console.log("Recived MQTT Message:", topic, message.toString());
    try {
      data = JSON.parse(message.toString());
    } catch (e) {
      console.warn("MQTT error:", message.toString());
      return;
    }
    
    if (topic === MQTT_DEVICE_TOPIC) {
      if (data.devId != undefined) {
        robotIDRef.current = data.devId;
        subscribeMQTT(MQTT_CTRL_TOPIC + data.devId);
        subscribeMQTT(MQTT_ROBOT_STATE_TOPIC + data.devId);
      }
      return;
    }

    // Publish Command to Robot
    if (props.viewer && topic === MQTT_CTRL_TOPIC + robotIDRef.current) {
      if (data.joints != undefined) {
        thetaBodyMQTT(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.joints)) {
            return data.joints;
          }
          console.log("Time:", data.time, "From:", topic, "Send Joint Body:", data.joints);
          return prev;
        });
      }
      if (data.tool != undefined) {
        thetaToolMQTT(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.tool)) {
            return data.tool;
          }
          // console.log("Time:", data.time, "From:", topic, "Send Joint Tool:", data.tool);
          return prev;
        });
      }
    }

    // Subscribe Robot State from Robot
    if (!props.viewer && topic === MQTT_ROBOT_STATE_TOPIC + robotIDRef.current) {
      if (data.state != undefined) {
        console.log("Robot state:", data.state);
        robotState(data.state);
      }
      if (data.model != undefined) {
        console.log("Robot model:", data.model);
      }
      if (data.joint_feedback != undefined) {
        thetaBodyFeedback(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.joint_feedback)) {
            return data.joint_feedback;
          }
          console.log("From:", topic, "Recive Joint Feedback:", data.joint_feedback);
          return prev;
        });
      }
      if (data.tool != undefined) {
        console.log("Robot current tool:", data.tool);
      }
      // robot_connected(true);
    }
  };

  window.mqttClient.on('message', handler);

  const handleBeforeUnload = () => {
    if (mqttclient != undefined) {
      publishMQTT("mgr/unregister", JSON.stringify({ devId: idtopic }));
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    window.mqttClient.off('message', handler);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);}
