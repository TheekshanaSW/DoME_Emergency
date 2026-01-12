const MQTT_BROKER = "broker.hivemq.com";
const MQTT_PORT = 8884;
const CLIENT_ID = "uom_mech_web_" + Math.random().toString(16).substr(2, 5);
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

let alarmStates = { ALARM1: false, ALARM2: false, ALARM3: false, ALARM4: false, SIRENX: false };
let intervals = { ALARM1: null, ALARM2: null, ALARM3: null, ALARM4: null, SIRENX: null };

client.connect({ 
    useSSL: true, 
    onSuccess: () => {
        document.getElementById("status-bar").innerText = "● SYSTEM ONLINE";
        document.getElementById("status-bar").className = "status-online";
    }, 
    onFailure: () => {
        document.getElementById("status-bar").innerText = "● CONNECTION FAILED";
        document.getElementById("status-bar").className = "status-offline";
    }
});

function toggleAlarm(id) {
    // Clear any existing loop (On or Off) before starting a new one
    if (intervals[id]) clearInterval(intervals[id]);

    alarmStates[id] = !alarmStates[id];
    const btn = document.getElementById(id);
    const label = btn.querySelector('.state-label');

    if (alarmStates[id]) {
        // --- ON MODE ---
        btn.classList.add('active-alarm');
        label.innerText = "ACTIVE";
        sendMQTT(id, "ON");
        // Loop ON indefinitely until toggled
        intervals[id] = setInterval(() => sendMQTT(id, "ON"), 2000);
    } else {
        // --- OFF MODE ---
        btn.classList.remove('active-alarm');
        label.innerText = "OFF";
        sendMQTT(id, "OFF");
        
        // Loop OFF for 30 seconds (15 pulses) to ensure hardware receives it
        let offCounter = 0;
        intervals[id] = setInterval(() => {
            sendMQTT(id, "OFF");
            offCounter++;
            if (offCounter >= 15) { 
                clearInterval(intervals[id]);
                console.log(`Finished clearing ${id}`);
            }
        }, 2000);
    }
}

function sendMQTT(subtopic, payload) {
    if (!client.isConnected()) return;
    const message = new Paho.MQTT.Message(payload);
    message.destinationName = TOPIC_PREFIX + subtopic;
    message.qos = 1; 
    client.send(message);
    console.log(`Sending ${payload} to ${subtopic}`);
}

function allOff() {
    Object.keys(alarmStates).forEach(id => {
        if (alarmStates[id]) toggleAlarm(id);
    });
}