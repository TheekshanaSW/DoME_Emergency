const MQTT_BROKER = "broker.hivemq.com";
const MQTT_PORT = 8884;
const CLIENT_ID = "uom_mech_web_" + Math.random().toString(16).substr(2, 5);
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

// Store the state and the repeat intervals
let alarmStates = { ALARM1: false, ALARM2: false, ALARM3: false, ALARM4: false, SIRENX: false };
let intervals = { ALARM1: null, ALARM2: null, ALARM3: null, ALARM4: null, SIRENX: null };

client.connect({ useSSL: true, onSuccess: () => {
    document.getElementById("status-bar").innerText = "● SYSTEM ONLINE";
    document.getElementById("status-bar").className = "status-online";
}, onFailure: () => {
    document.getElementById("status-bar").innerText = "● CONNECTION FAILED";
    document.getElementById("status-bar").className = "status-offline";
}});

function toggleAlarm(id) {
    alarmStates[id] = !alarmStates[id];
    const btn = document.getElementById(id);
    const label = btn.querySelector('.state-label');

    if (alarmStates[id]) {
        // TURN ON
        btn.classList.add('active-alarm');
        label.innerText = "ACTIVE";
        sendMQTT(id, "ON");
        // Start continuous sending every 2 seconds
        intervals[id] = setInterval(() => sendMQTT(id, "ON"), 2000);
    } else {
        // TURN OFF
        btn.classList.remove('active-alarm');
        label.innerText = "OFF";
        clearInterval(intervals[id]);
        sendMQTT(id, "OFF");
    }
}

function sendMQTT(subtopic, payload) {
    if (!client.isConnected()) return;
    const message = new Paho.MQTT.Message(payload);
    message.destinationName = TOPIC_PREFIX + subtopic;
    message.qos = 1;
    client.send(message);
    console.log(`Sent ${payload} to ${subtopic}`);
}

function allOff() {
    Object.keys(alarmStates).forEach(id => {
        if (alarmStates[id]) toggleAlarm(id);
    });
}