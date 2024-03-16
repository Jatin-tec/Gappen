const handleRoomJoined = async (roomId) => {
    document.getElementById('roomId').innerText = roomId;
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

const handleSetUsername = (username) => {
    console.log(`Your username is: ${username}`);
    document.getElementById('remoteUsername').innerText = username;
}

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
    console.log('Received answer');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

const handleCandidate = async (candidate, roomId) => {
    console.log(`Received candidate: ${candidate}`);
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

function createPeerConnection(roomId) {
    const servers = {
        iceServers: [
            {
                urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
            },
        ],
    };
    peerConnection = new RTCPeerConnection(servers);
    peerConnection.ontrack = event => {
        if (event.streams && event.streams[0]) {
            console.log(`Received remote stream: ${event.streams[0]}`);
            document.getElementById('remoteStream').srcObject = event.streams[0];
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

const sendMessageButton = document.getElementById("sendMessage");
sendMessageButton.addEventListener("click", function () {
    const message = document.getElementById('messageInput').value;
    const roomId = document.getElementById('roomId').innerText;
    var chats = document.getElementsByClassName("chat-input");
    chats[0].innerHTML += "<div class=" + "userchat1" + "><p class=" + "user1chat" + ">" + message + "</p>" + '</div><hr>';
    socket.emit("send-message", message, roomId);
});

const handleReceiveMessage = (message) => {
    console.log(`Received message: ${message}`);

    var chats = document.getElementsByClassName("chat-input");
    chats[0].innerHTML += "<div class=" + "userchat2" + "><p class=" + "user2chat" + ">" + message + "</p>" + '</div><hr>';
}

const handleSkip = () => {
    resetVideoCall(); // Handle resetting the call on the other user's end as well
};

function resetVideoCall() {
    // Implement logic to reset or clear the current video call setup
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    // Optionally, clear the remote video display or show a message
    document.getElementById('remoteStream').srcObject = null;
    socket.emit('join');
}

const handlePartnerDisconnected = () => {
    resetVideoCall(); // Handle resetting the call on the other user's end as well
};