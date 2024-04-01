async function hashFingerprint(fingerprint) {
    const msgUint8 = new TextEncoder().encode(fingerprint); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // bytes to hex string
    return hashHex;
}
