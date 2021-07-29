import React from 'react';
import Pizzicato from 'pizzicato';

function Buzzer(volumeHi = 0.01, balance = 0.0) {
    this.sound = new Pizzicato.Sound({
        source: 'wave',
        options: {
            type: 'sawtooth',
            volume: volumeHi
        }
    });
    this.play = () => this.sound.play();
    this.pause = () => this.sound.pause();
    this.stop = () => this.sound.stop();
    this.volume = (value = 0.1) => this.sound.volume = value;
    this.setPan = (value = 0.0) => this.stereoEffect.options.pan = value;
    this.stereoEffect = new Pizzicato.Effects.StereoPanner({pan: balance});
    this.sound.addEffect(this.stereoEffect);
}

export default Buzzer;
