import React from "react";

export default class GpsTracker extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            newCoords: null
        };
        this.positionChanged = this.positionChanged.bind(this);
    }

    componentDidMount() {
        if (navigator.permissions && navigator.permissions.query) {
            console.debug('Ask geolocation permission');
            navigator.permissions.query({name: 'geolocation'})
                .then(function (result) {
                    console.debug('Geolocation permission: ' + result.state);
                });
        } else {
            console.warn('No permission API');
        }

        this.positionHandler = navigator.geolocation.watchPosition(this.positionChanged, error => {
            console.error('Cannot get position: ' + error.code + " : " + error.message);
            alert(`${error.code}: ${error.message}`);
        }, {enableHighAccuracy: true, maximumAge: 0, timeout: 5000});
    }

    componentWillUnmount() {
        navigator.geolocation.clearWatch(this.positionHandler);
    }

    positionChanged(pos) {
        console.debug('Position changed: ' + new Date().toLocaleTimeString() + ': ' + JSON.stringify(pos));
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const newCoords = {lat, lng, accuracy};
        console.debug(`New GPS coordinates: ${JSON.stringify(newCoords)}`);
        if ('updateCoordinates' in this.props) {
            this.props.updateCoordinates(newCoords);
        }
        this.setState((prevState, props) => {return {newCoords}});
    };

    render() {

        return null;
    };
}