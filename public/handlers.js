var localStream = null;
var remoteStream = null;
var peerConnection = null;


const handleCreateOffer = async (remoteUsername, roomId) => {
    document.getElementById('roomId').innerText = roomId;
    document.getElementById('remoteUsername').innerText = remoteUsername;

    await createPeerConnection(roomId);

    console.log('Creating offer for', remoteUsername);
    console.log("localStream", localStream);
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, roomId);

};

const handleCreatePear = async (remoteUsername, roomId) => {
    document.getElementById('roomId').innerText = roomId;
    document.getElementById('remoteUsername').innerText = remoteUsername;

    await createPeerConnection(roomId);

    console.log('Awaiting offer from', remoteUsername);
    console.log("localStream", localStream);
}

const handleOffer = async (offer, roomId) => {
    console.log(`Received offer`, offer);

    peerConnection.setRemoteDescription(offer.offer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);   
    console.log('Sending answer:', answer);
    
    const offerIceCandidates = await socket.emitWithAck('answer', answer, roomId);        
    offerIceCandidates.forEach(candidate => {
        peerConnection.addIceCandidate(candidate)
        console.log('==========Added candidate Offer===========');
    });
};

const handleAnswer = async (answer, roomId) => {
    console.log(`Received answer`, answer);
    await peerConnection.setRemoteDescription(answer.answer);

    const answerIceCandidates = socket.emitWithAck("set-answer-ice", roomId);
    answerIceCandidates.forEach(candidate => {
        peerConnection.addIceCandidate(candidate)
        console.log('==========Added candidate Answer===========');
    });
};

const handleCandidate = async (candidate) => {
    console.log(`Received candidate:`, candidate);
    peerConnection.addIceCandidate(candidate);
};

function createPeerConnection(roomId=null) {
    return new Promise(async (resolve, reject) => {
        
        const response = await fetch("https://gappen.metered.live/api/v1/turn/credentials?apiKey=ade90811dead8f8c262650df276cd42c39eb");
        const json = await response.json();
        const servers = {
            iceServers: json.slice(0, 3)
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
                socket.emit('ice-candidate', event.candidate, roomId);
            }
        };

        // Listen for track events
        peerConnection.ontrack = event => {
            if (event.streams && event.streams[0]) {
                console.log('Received remote stream:', event.streams[0]);
                console.log('peerConnection', peerConnection);
                document.getElementById('remoteStream').srcObject = event.streams[0];
            }
        };
        resolve();
    });
}

const skipButton = document.getElementById("skipButton");
skipButton.addEventListener("click", function () {
    socket.emit("skip");
    resetVideoCall(); // Function to reset or clear the current video call setup
});

const sendMessageButton = document.getElementById("send");
sendMessageButton.addEventListener("click", function () {
    const message = document.getElementById('textInput').value;
    document.getElementById('textInput').value="";
    const roomId = document.getElementById('roomId').innerText;
    var chats = document.getElementsByClassName("send-message");
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
