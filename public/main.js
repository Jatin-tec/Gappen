const roomName = window.location.pathname.split('/')[2];

socket.emit('join', roomName)
socket.on('created', handleRoomCreated)
socket.on('joined', handleRoomJoined)
socket.on('ready', initiateCall)
socket.on('leave', handleLeave)
socket.on('full', () => {
    console.log('Room is full');
});


socket.on('offer', handleOffer)
socket.on('answer', handleAnswer)
socket.on('ice-candidate', handleNewICECandidateMsg)


// userVideREf, peerVideoRef - both are refs for video elements
// rtcConnectionRef - this will store the ref to the WebRTC connection that will be created later
// socketRef - will store the ref of the socket
// userStreamRef - will keep a reference to the user media streams that we get from the camera and microphone