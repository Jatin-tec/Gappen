// client/main.js
const socket = io();

let localStream = null;
let remoteStream = null;
let peerConnection = null;

async function initializeChat() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      document.getElementById('localStream').srcObject = localStream;
      const username = document.getElementById('localUsername').getAttribute('data-username');
      socket.emit('join', username);
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  }

socket.on('roomJoined', handleRoomJoined)
socket.on('setUsername', handleSetUsername)
socket.on('offer', (offer, roomId) => handleOffer(offer, roomId))
socket.on('answer', (answer, roomId) => handleAnswer(answer, roomId))
socket.on('ice-candidate', (candidate, roomId) => handleCandidate(candidate, roomId))
socket.on('userSkipped', () => handleSkip())
socket.on('skip', () => handleSkip())
socket.on('partnerDisconnected', () => handlePartnerDisconnected())
socket.on('receive-message', (message) => handleReceiveMessage(message))
socket.on('leave', () => handleLeave())

initializeChat();