import Pizzicato from 'pizzicato';

export const BuzzerConstants = {
    Frequency: {
        MIN_FREQUENCY: 1,
        MAX_FREQUENCY: 100,
        FREQUENCY_STEP: 1.0,
    },
    Volume: {
        MIN_VOLUME: 0.0,
        MAX_VOLUME: 1.0,
        VOLUME_STEP: 0.01,
    },
    Balance: {
        MIN_BALANCE: -1.0,
        NORM_BALANCE: 0.0,
        MAX_BALANCE: 1.0,
        BALANCE_STEP: 0.005
    }
};

export function Buzzer({volumeHi = 0.01, balance = 0.0, volumeFrequency = 440} = {}) {
    this.soundContext = Pizzicato.context.createAnalyser();
    this.sound = new Pizzicato.Sound({
        source: 'wave',
        options: {
            type: 'sawtooth',
            volume: volumeHi,
            frequency: volumeFrequency
        }
    });
    this.sound.connect(this.soundContext);
    this.play = () => this.sound.play();
    this.pause = () => this.sound.pause();
    this.stop = () => this.sound.stop();
    this.volume = (value = 0.1) => this.sound.volume = value;
    this.frequency = (value = 100) => this.sound.frequency = value;
    this.setBalance = (value = 0.0) => this.stereoEffect.pan = value;
    this.stereoEffect = new Pizzicato.Effects.StereoPanner({pan: balance});
    this.sound.addEffect(this.stereoEffect);
}
