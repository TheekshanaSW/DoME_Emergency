const MQTT_BROKER = "broker.hivemq.com";
const MQTT_PORT = 8884;
const CLIENT_ID = "uom_mech_web_" + Math.random().toString(16).substr(2, 5);
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

let alarmStates = { ALARM1: false, ALARM2: false, ALARM3: false, ALARM4: false, SIRENX: false };

// Connection Options
client.connect({ 
    useSSL: true, 
    onSuccess: () => {
        document.getElementById("status-bar").innerText = "● SYSTEM ONLINE";
        document.getElementById("status-bar").className = "status-online";
        startHeartbeat(); // Start the continuous background sync
    }, 
    onFailure: () => {
        document.getElementById("status-bar").innerText = "● CONNECTION FAILED";
        document.getElementById("status-bar").className = "status-offline";
    }
});

// HEARTBEAT: Sends current state of everything every 5 seconds
function startHeartbeat() {
    setInterval(() => {
        Object.keys(alarmStates).forEach(id => {
            const payload = alarmStates[id] ? "ON" : "OFF";
            sendMQTT(id, payload);
        });
        console.log("Heartbeat: All states synced to broker.");
    }, 5000); 
}

function toggleAlarm(id) {
    alarmStates[id] = !alarmStates[id];
    const btn = document.getElementById(id);
    const label = btn.querySelector('.state-label');

    if (alarmStates[id]) {
        btn.classList.add('active-alarm');
        label.innerText = "ACTIVE";
    } else {
        btn.classList.remove('active-alarm');
        label.innerText = "OFF";
    }
    
    // Send immediate update on click
    const payload = alarmStates[id] ? "ON" : "OFF";
    sendMQTT(id, payload);
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
        if (alarmStates[id]) {
            alarmStates[id] = false;
            const btn = document.getElementById(id);
            btn.classList.remove('active-alarm');
            btn.querySelector('.state-label').innerText = "OFF";
            sendMQTT(id, "OFF");
        }
    });
}