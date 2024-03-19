// client/main.js
const socket = io();

async function initializeChat() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      document.getElementById('localStream').srcObject = localStream;

      const username = document.getElementById('localUsername').getAttribute('data-username');
      socket.emit('join', username);
    } catch (error) {
      console.error('Error getting user media:', error);
    }
  }

socket.on('create-offer', (remoteUsername, roomId) => handleCreateOffer(remoteUsername, roomId))
socket.on('create-pear', (remoteUsername, roomId) => handleCreatePear(remoteUsername, roomId))

socket.on('offer', (offer, roomId) => handleOffer(offer, roomId))
socket.on('answer', (answer, roomId) => handleAnswer(answer, roomId))
socket.on('ice-candidate', (candidate) => handleCandidate(candidate))

socket.on('userSkipped', () => handleSkip())
socket.on('skip', () => handleSkip())
socket.on('partnerDisconnected', () => handlePartnerDisconnected())
socket.on('receive-message', (message) => handleReceiveMessage(message))
socket.on('leave', () => handleLeave())

initializeChat();