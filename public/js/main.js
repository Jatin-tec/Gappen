// client/main.js
const socket = io();

var localStream = null;
var peerConnection = null;
var roomName = null;
var remoteUsername = null;

async function initializeChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const localVideo = document.getElementById('localStream')
        localVideo.srcObject = localStream;
        localVideo.style.transform = 'scaleX(-1)';
        const username = document.getElementById('localUsername').getAttribute('data-username');
        socket.emit('join', username);
    } catch (error) {
        console.error('Error getting user media:', error);
    }
}

async function createPeerConnection(roomId) {
    const response = await fetch("/api/get-servers");
    const config = { iceServers: await response.json() };

    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) socket.emit('ice-candidate', event.candidate, roomId);
    };

    peerConnection.ontrack = event => {
        if (event.streams[0]) updateRemoteStream(event.streams[0]);
    };
}

function updateRemoteStream(stream) {
    document.getElementById('loader').style.display = 'block';
    if (stream) {
        document.getElementById('loader').style.display = 'none';
    }
    document.getElementById('remoteStream').srcObject = stream;
}

function updateUIForCall(remoteUsername, roomId) {
    roomName = roomId;
    document.getElementById('remoteUsername').innerText = remoteUsername;
}

function userResponse() {
    const userText = document.getElementById("textInput").value;
    if (userText == "" || roomName == null) {
    } else {
        const objDiv = document.getElementById("chat-body");

        objDiv.innerHTML += `<div class="chat-send">
        <p>${userText}</p>
        </div>`
        document.getElementById("textInput").value = "";
        socket.emit("send-message", userText, roomName);
    }
}

//press enter on keyboard and send message
addEventListener("keypress", (e) => {
    if (e.keyCode === 13) {

        const e = document.getElementById("textInput");
        if (e === document.activeElement) {
            userResponse();
        }
    }
});

socket.on("receive-message", (response) => {
    const objDiv = document.getElementById("chat-body");
    objDiv.innerHTML += `<div class="chat-receive">
    <p>${response}</p>
    </div>`
});


// Socket event listeners
socket.on('waiting', () => {
    document.getElementById('remoteUsername').innerText = "Looking for partner...";
    // document.getElementById('loader').style.display = 'block';
});

socket.on('matchNotFound', () => {
    document.getElementById('remoteUsername').innerText = "It seems no ones online, try again later!";
    document.getElementById('loader').style.display = 'none';
});

socket.on('create-offer', async (remoteUsername, roomId) => {
    updateUIForCall(remoteUsername, roomId);
    await createPeerConnection(roomId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, roomId);
});

socket.on('create-peer', async (remoteUsername, roomId) => {
    updateUIForCall(remoteUsername, roomId);
    await createPeerConnection(roomId);
});

socket.on('offer', async (offer, roomId) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, roomId);
});

socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', candidate => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('userSkipped', resetVideoCall);

socket.on('partnerDisconnected', () => {
    console.log('Partner disconnected');
    resetVideoCall();
});

document.getElementById("skipButton").addEventListener("click", () => {
    socket.emit("skip");
    resetVideoCall();
});

function resetVideoCall() {
    document.getElementById('loader').style.display = 'block';
    const objDiv = document.getElementById("chat-body");
    objDiv.innerHTML = "";

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    updateRemoteStream(null);
    updateUIForCall('Looking for partner...', null);
}

// mic toggle
const changeText = document.querySelector("#mute");

changeText.addEventListener("click", function () {
    const remoteStream = document.getElementById("remoteStream").srcObject;
    if (!remoteStream) return;
    const audioTracks = remoteStream.getAudioTracks();
    if (!audioTracks) return;
    const audioTrack = audioTracks[0];
    if (!audioTrack) return;

    if (changeText.textContent === "mic_off") {
        changeText.textContent = "mic";
        audioTrack.enabled = true; // Enable the audio track
    } else {
        changeText.textContent = "mic_off";
        audioTrack.enabled = false; // Disable the audio track
    }
});

initializeChat();
