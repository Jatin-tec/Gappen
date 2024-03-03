const socket = io();

var localStream;
var remoteStream;
var peerConnection;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.1.google.com:19302', 'stun:stun2.1.google.com:19302']
        }
    ]
};

const joinChat = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
    });
    document.getElementById('user-1').srcObject = localStream;
    socket.emit('join'); // No room name needed anymore
};
joinChat();

const handleRoomJoined = async (roomName) => {
    console.log('Room joined');
    socket.emit('ready', roomName);
};

const handleTrackEvent = (event) => {
    remoteStream = event.streams[0];
}

const handleICECandidateEvent = (event) => {
    if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
    }
}

const createPeerConnection = (roomId) => {
    const connection = new RTCPeerConnection(servers);
    connection.onicecandidate = handleICECandidateEvent(roomId);
    connection.ontrack = handleTrackEvent;
    return connection;
}


const initiateCall = async (roomName) => {
    console.log(`Initiating call in room ${roomName}`);

    peerConnection = createPeerConnection(roomName);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        document.getElementById('user-2').srcObject = remoteStream;
    };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`ice-candidate emitted in room ${roomName} with candidate ${event.candidate}`);
            socket.emit('ice-candidate', event.candidate, roomName);
        }
    };
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)    
    console.log(`offer created in room ${roomName}`);
    socket.emit('offer', peerConnection.localDescription, roomName);

}

const handleOffer = async (offer, roomName) => {
    console.log(`Handling offer in room ${roomName}`);

    peerConnection = createPeerConnection(roomName);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        document.getElementById('user-2').srcObject = remoteStream;
    };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, roomName);
        }
    };
    
    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    socket.emit('answer', peerConnection.localDescription, roomName)
}

const handleAnswer = async (answer) => {
    try {
        if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(answer);
        } else {
            console.log("Not in the correct state to set remote description for answer");
        }
    } catch (error) {
        console.error("Error setting remote description with answer", error);
    }
};

const handleNewICECandidateMsg = async (candidate, roomName) => {
    try {
        if (peerConnection.signalingState !== "stable") {
            console.log("Waiting to add ICE candidate until signaling state is stable");
            setTimeout(() => peerConnection.addIceCandidate(candidate), 1000);
        } else {
            await peerConnection.addIceCandidate(candidate);
        }
    } catch (error) {
        console.error("Error adding received ICE candidate", error);
    }
};

const handleLeave = () => {
    document.getElementById('user-2').srcObject.getTracks().forEach(track => track.stop());
    document.getElementById('user-2').srcObject = null;
    peerConnection.close();
    peerConnection = null;
}