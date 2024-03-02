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

const handleRoomCreated = async (roomName) => {
    console.log('Room created');
    localStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
    })
    document.getElementById('user-1').srcObject = localStream;
};

const handleRoomJoined = async (roomName) => {
    console.log('Room joined');
    localStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
    })
    document.getElementById('user-1').srcObject = localStream;
    socket.emit('ready', roomName);
};

const createPeerConnection = () => {
    const connection = new RTCPeerConnection(servers);

    connection.onicecandidate = handleICECandidateEvent;
    connection.ontrack = handleTrackEvent;

    return connection;
}


const initiateCall = () => {
    console.log('Initiating call');

    peerConnection = createPeerConnection();
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
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', peerConnection.localDescription, roomName);
        });
}

const handleOffer = (offer) => {
    peerConnection = createPeerConnection();

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
    peerConnection.setRemoteDescription(offer)
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            socket.emit('answer', peerConnection.localDescription, roomName);
        });
}

const handleAnswer = (answer) => {
    peerConnection.setRemoteDescription(answer);
}

const handleICECandidateEvent = (event) => {
    if (event.candidate) {
        socket.emit('ice-candidate', event.candidate, roomName);
    }
}

const handleNewICECandidateMsg = (candidate) => {
    const candidateObj = new RTCIceCandidate(candidate);
    peerConnection.addIceCandidate(candidateObj);
}

const handleTrackEvent = (event) => {
    remoteStream = event.streams[0];
}