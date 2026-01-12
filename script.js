/* script.js */
const MQTT_BROKER = "broker.hivemq.com";
const MQTT_PORT = 8884; // Secure port is mandatory
const CLIENT_ID = "uom_mech_" + Math.random().toString(16).substr(2, 5);
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

// This object tracks if the alarm is ON or OFF locally
let alarmStates = { ALARM1: false, ALARM2: false, ALARM3: false, ALARM4: false, SIRENX: false };
let intervals = { ALARM1: null, ALARM2: null, ALARM3: null, ALARM4: null, SIRENX: null };

client.connect({ 
    useSSL: true, 
    onSuccess: () => {
        const status = document.getElementById("status-bar");
        status.innerText = "● SYSTEM ONLINE";
        status.className = "status-online";
    }, 
    onFailure: (e) => {
        console.error("Connection Failed", e);
        document.getElementById("status-bar").innerText = "● CONNECTION ERROR";
    }
});

function toggleAlarm(id) {
    alarmStates[id] = !alarmStates[id];
    const btn = document.getElementById(id);
    const label = btn.querySelector('.state-label');

    if (alarmStates[id]) {
        btn.classList.add('active-alarm');
        label.innerText = "ACTIVE";
        sendMQTT(id, "ON");
        // Start the continuous "ON" signal every 2 seconds
        intervals[id] = setInterval(() => sendMQTT(id, "ON"), 2000);
    } else {
        btn.classList.remove('active-alarm');
        label.innerText = "OFF";
        clearInterval(intervals[id]); // Stop the loop
        sendMQTT(id, "OFF");
    }
}

function sendMQTT(subtopic, payload) {
    if (!client.isConnected()) return;
    const message = new Paho.MQTT.Message(payload);
    message.destinationName = TOPIC_PREFIX + subtopic;
    message.qos = 1;
    client.send(message);
}

function allOff() {
    Object.keys(alarmStates).forEach(id => {
        if (alarmStates[id]) toggleAlarm(id);
    });
}