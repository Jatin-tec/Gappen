const roomName = window.location.pathname.split('/')[2];

socket.on('joined', handleRoomJoined)
socket.on('ready', initiateCall)
socket.on('leave', handleLeave)
socket.on('full', () => {
    console.log('Room is full');
});

socket.on('offer', handleOffer)
socket.on('answer', handleAnswer)
socket.on('ice-candidate', handleNewICECandidateMsg)
