var localStream = null;
var remoteStream = null;
var peerConnection = null;
var candidateQueue = []; // Queue for storing candidates before the offer/answer is sent

var state_queue = []

const handleRoomJoined = async (roomId) => {
    document.getElementById('roomId').innerText = roomId;
    if (socket.id === roomId.split('-')[1]) { // Decide who creates the offer
        await createPeerConnection(roomId);
        console.log(localStream);
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer, roomId);
    }
};

const handleOffer = async (offer, roomId, candidateQueue) => {
    console.log(`Received offer`, offer);
    if (!peerConnection) {
        console.log('Creating peer connection for offer');
        await createPeerConnection(roomId, offer);
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);   
 
    console.log('Candidate queue:', candidateQueue);
    candidateQueue.forEach(candidate => {
        console.log('================Adding candidate===========', candidate);
        peerConnection.addIceCandidate(candidate);
    });

    socket.emit('answer', answer, roomId);
};

const handleAnswer = async (answer, candidateQueue) => {
    console.log(`Received answer`, answer);
    console.log('Candidate queue:', candidateQueue);

    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    
    candidateQueue.forEach(candidate => {
        console.log('================Adding candidate===========', candidate);
        peerConnection.addIceCandidate(candidate);
    });
};

const handleCandidate = async (candidate) => {
    console.log(`Received candidate:`, candidate);
    peerConnection.addIceCandidate(candidate);
};

function createPeerConnection(roomId, offer) {
    return new Promise((resolve, reject) => {
        const servers = {
            iceServers: [
                {
                    urls:[
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302'
                    ]
                }
            ],
        };
        peerConnection = new RTCPeerConnection(servers);
        
        // Add tracks from the local stream to the peer connection
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        // Listen for negotiationneeded event
        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log('signaling state event', event);
            console.log('signaling state', peerConnection.signalingState)
        });

        // Listen for ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log('Generated candidate:', event.candidate);
                // candidateQueue.push(event.candidate);
                socket.emit('ice-candidate', event.candidate, roomId);
            }
        };

        // Listen for track events
        peerConnection.ontrack = event => {
            if (event.streams && event.streams[0]) {
                console.log('Received remote stream:', event.streams[0]);
                document.getElementById('remoteStream').srcObject = event.streams[0];
            }
        };
        
        if (offer) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        }

        resolve();
    });
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

const handleSetUsername = (username) => {
    console.log(`Your username is: ${username}`);
    document.getElementById('remoteUsername').innerText = username;
}

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