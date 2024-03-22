// client/main.js
const socket = io();

var localStream = null;
var peerConnection = null;

async function initializeChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        document.getElementById('localStream').srcObject = localStream;

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
    document.getElementById('remoteStream').srcObject = stream;
}

function updateUIForCall(remoteUsername, roomId) {
    document.getElementById('roomId').innerText = roomId;
    document.getElementById('remoteUsername').innerText = remoteUsername;
}

// Socket event listeners
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
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    updateRemoteStream(null);
    updateUIForCall('User', 'Gapen');
}

initializeChat();
