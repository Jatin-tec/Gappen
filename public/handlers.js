const socket = io();
const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ]
        }
    ]
};

let localStream;
let remoteStream;
let peerConnection;

async function joinChat() {
    localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
    });
    document.getElementById('user-1').srcObject = localStream;
    socket.emit('join');
};

const handleRoomJoined = async (roomId) => {
    console.log(`Joined room: ${roomId}`);
    if (!peerConnection) {
        createPeerConnection(roomId);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        if (socket.id < roomId.split('-')[1]) { // Simple way to decide who creates the offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', offer, roomId);
        }
    }
};

const handleOffer = async (offer, roomId) => {
    if (!peerConnection) {
        createPeerConnection(roomId);
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, roomId);
};

const handleAnswer = async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

const handleCandidate = async (candidate, roomId) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function createPeerConnection(roomId) {
    peerConnection = new RTCPeerConnection(servers);
    peerConnection.ontrack = event => {
        if (event.streams && event.streams[0]) {
            console.log(`Received remote stream: ${event.streams[0]}`);
            document.getElementById('user-2').srcObject = event.streams[0];
        }
    };
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, roomId);
        }
    };
}

const skipButton = document.getElementById("skipButton");
skipButton.addEventListener("click", function () {
    socket.emit("skip");
    resetVideoCall(); // Function to reset or clear the current video call setup
});

const handleSkip = (skippedUserId) => {
    console.log(`User ${skippedUserId} skipped the call.`);
    resetVideoCall(); // Handle resetting the call on the other user's end as well
};

function resetVideoCall() {
    // Implement logic to reset or clear the current video call setup
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    // Optionally, clear the remote video display or show a message
    document.getElementById('user-2').srcObject = null;
    joinChat(); // Rejoin the chat to be matched with another user
}

joinChat();