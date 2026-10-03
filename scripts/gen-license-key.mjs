// Jana pasangan kunci lesen Premium (ECDSA P-256).
// Kunci peribadi -> rahsia GitHub LICENSE_PRIVATE_JWK. Kunci awam -> PUBLIC_JWK dalam js/premium.js.
const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const priv = await crypto.subtle.exportKey('jwk', privateKey);
const pub = await crypto.subtle.exportKey('jwk', publicKey);
console.log('LICENSE_PRIVATE_JWK (RAHSIA):\n' + JSON.stringify(priv));
console.log('\nPUBLIC_JWK:\n' + JSON.stringify({ kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y }));
