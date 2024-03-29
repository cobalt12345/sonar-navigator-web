
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

export function LogDecorator(Func) {
    let propDescriptors = new Map(Object.entries(Object.getOwnPropertyDescriptors(Func)));
    for (let prop in Func) {
        const propDescriptor = propDescriptors.get(prop);
        propDescriptor.enumerable = true;
        if (typeof propDescriptor.value === 'function') {
            propDescriptor.value = MethodWrapper(propDescriptor.value, prop);
        }
        Object.defineProperty(this, prop, propDescriptor);
    }
}

function MethodWrapper(method, methodName) {
    return function(args) {
        const methodCallResult = method(args);
        console.debug('Called: ' + methodName + '(' + Object.entries(args) + '): ' + methodCallResult);

        return methodCallResult;
    }
}