const MQTT_BROKER = "13.53.87.92"; 
const MQTT_PORT = 8083; 
const CLIENT_ID = "uom_web_" + Math.random().toString(16).substr(2, 5);
const TOPIC_PREFIX = "uom/mechanical/emergency/2026/system_alpha/"; 

let client;
let alarmStates = { ALARM1: false, ALARM2: false, ALARM3: false, ALARM4: false, SIRENX: false };

function initMQTT() {
    if (typeof Paho === "undefined") {
        setTimeout(initMQTT, 1000);
        return;
    }

    client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

    client.onConnectionLost = (responseObject) => {
        document.getElementById("status-bar").innerText = "● RECONNECTING...";
        document.getElementById("status-bar").className = "status-offline";
        setTimeout(connectClient, 5000);
    };

    connectClient();
}

function connectClient() {
    const options = {
        useSSL: true, 
        timeout: 5,
        onSuccess: () => {
            document.getElementById("status-bar").innerText = "● AWS ONLINE";
            document.getElementById("status-bar").className = "status-online";
            startHeartbeat();
        },
        onFailure: (e) => {
            console.log("WS Connection Failed", e);
            document.getElementById("status-bar").innerText = "● PORT 8083 BLOCKED/OFFLINE";
            document.getElementById("status-bar").className = "status-offline";
        }
    };
    client.connect(options);
}

initMQTT();

function startHeartbeat() {
    if (window.hbInterval) clearInterval(window.hbInterval);
    window.hbInterval = setInterval(() => {
        if (client && client.isConnected()) {
            Object.keys(alarmStates).forEach(id => {
                sendMQTT(id, alarmStates[id] ? "ON" : "OFF");
            });
            const now = new Date().toLocaleTimeString();
            document.getElementById("last-sync").innerText = "Heartbeat: " + now;
        }
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
    sendMQTT(id, alarmStates[id] ? "ON" : "OFF");
}

function sendMQTT(subtopic, payload) {
    if (client && client.isConnected()) {
        const message = new Paho.MQTT.Message(payload);
        message.destinationName = TOPIC_PREFIX + subtopic;
        message.qos = 1;
        client.send(message);
    }
}

function allOff() {
    Object.keys(alarmStates).forEach(id => {
        if (alarmStates[id]) {
            alarmStates[id] = false;
            const btn = document.getElementById(id);
            if(btn) {
                btn.classList.remove('active-alarm');
                btn.querySelector('.state-label').innerText = "OFF";
                sendMQTT(id, "OFF");
            }
        }
    });
}