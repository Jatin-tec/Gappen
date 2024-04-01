const updateLocation = async () => {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async position => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch('/api/update-location', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Add your authentication headers here if necessary
                    },
                    body: JSON.stringify({ latitude, longitude })
                });
                if (response.ok) {
                } else {
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }, (error) => {
            console.error('Error getting location:', error);
        });
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}
updateLocation();