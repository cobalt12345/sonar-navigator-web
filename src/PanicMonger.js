import React from 'react';
let Shake = require('shake.js');

export default class PanicMonger extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        }
        this.processDeviceShaking = this.processDeviceShaking.bind(this);
        let options = props.options ?? {
            threshold: 20,
            timeout: 1000
        };
        let shakeEvent = new Shake(options);
        shakeEvent.start();
    }

    componentDidMount() {
        console.debug('Paniker mounted...');
        console.debug('Start listening...');
        window.addEventListener('shake', this.props.callback ?? this.processDeviceShaking, false);
    }

    componentWillUnmount() {
        console.debug('Stop listening')
        window.removeEventListener('shake', this.props.callback ?? this.processDeviceShaking,false);
    }

    processDeviceShaking = (event) => {
        console.debug('Device shaking detected.');
    }

    render() {
        return null;
    }
}