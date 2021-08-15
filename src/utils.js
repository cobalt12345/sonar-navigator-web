
export function gpsToXYZ({lat, lng}) {
    const cosLat = Math.cos(lat * Math.PI / 180.0);
    const sinLat = Math.sin(lat * Math.PI / 180.0);
    const cosLon = Math.cos(lng * Math.PI / 180.0);
    const sinLon = Math.sin(lng * Math.PI / 180.0);
    const rad = 6378137.0;
    const f = 1.0 / 298.257224;
    const C = 1.0 / Math.sqrt(cosLat * cosLat + (1 - f) * (1 - f) * sinLat * sinLat);
    const S = (1.0 - f) * (1.0 - f) * C;
    const h = 0.0;
    const coords = {
        x: (rad * C + h) * cosLat * cosLon,
        y: (rad * C + h) * cosLat * sinLon,
        z: (rad * S + h) * sinLat,
        [Symbol.toPrimitive]: function (hint) {

            return '[' + this.x + ', ' + this.y + ', ' + this.z + ']';
        }
    };

    return coords;
}