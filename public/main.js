// client/main.js
const socket = io();
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
};

let localStream = null;
let remoteStream = null;
let peerConnection = null;

async function initializeChat() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      document.getElementById('user-1').srcObject = localStream;
      const username = document.getElementById('username').getAttribute('data-username');
      socket.emit('join', username);
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  }

socket.on('roomJoined', handleRoomJoined)
socket.on('offer', (offer, roomId) => handleOffer(offer, roomId))
socket.on('answer', (answer, roomId) => handleAnswer(answer, roomId))
socket.on('ice-candidate', (candidate, roomId) => handleCandidate(candidate, roomId))
socket.on('userSkipped', () => handleSkip())
socket.on('skip', () => handleSkip())
socket.on('leave', () => handleLeave())

initializeChat();