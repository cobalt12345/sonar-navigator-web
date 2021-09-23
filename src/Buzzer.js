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
        VOLUME_STEP: 0.05,
    },
    Balance: {
        ONLY_LEFT: -1.0,
        ONLY_RIGHT: 1.0,
        MIN_BALANCE: -1.0,
        NORM_BALANCE: 0.0,
        MAX_BALANCE: 1.0,
        BALANCE_STEP: 0.005
    }
};

export function Buzzer({volumeLeft = 0.01, volumeRight = 0.01},
                       balance = BuzzerConstants.Balance.NORM_BALANCE,
                       volumeFrequency = BuzzerConstants.Balance.MIN_FREQUENCY) {

    if (Buzzer.instanceNum) {
        ++Buzzer.instanceNum;
    } else {
        Buzzer.instanceNum = 1;
    }
    console.debug('Buzzer instance #' + Buzzer.instanceNum);

    if (!Buzzer.instance) {
        console.debug('New Buzzer instance')
        let left = new Pizzicato.Sound({
            source: 'wave',
            options: {
                detached: false,
                type: 'sawtooth',
                volume: volumeLeft,
                frequency: volumeFrequency
            }
        });
        left.addEffect(new Pizzicato.Effects.StereoPanner({pan: BuzzerConstants.Balance.ONLY_LEFT}));

        let right = new Pizzicato.Sound({
            source: 'wave',
            options: {
                detached: false,
                type: 'sawtooth',
                volume: volumeRight,
                frequency: volumeFrequency
            }
        });
        right.addEffect(new Pizzicato.Effects.StereoPanner({pan: BuzzerConstants.Balance.ONLY_RIGHT}));

        this.sound = {
            left,
            right,
            set frequency(value) {
                this.left.frequency = this.right.frequency = value;
            },
            get frequency() {
                return this.left.frequency || this.right.frequency;
            },
            group: new Pizzicato.Group([left, right])
        }
        this.stereoEffect = new Pizzicato.Effects.StereoPanner({pan: balance});
        this.sound.group.addEffect(this.stereoEffect);
        this.play = () => this.sound.group.play();
        this.pause = () => this.sound.group.pause();
        this.stop = () => this.sound.group.stop();
        this.volume = ({volumeLeft = 0.1, volumeRight = 0.1}) => {
            this.sound.left.volume = volumeLeft;
            this.sound.right.volume = volumeRight;
        }
        this.frequency = (value = 100) => this.sound.frequency = value;
        this.setBalance = (value = 0.0) => {
            this.stereoEffect.pan = value;
        }

        Buzzer.instance = this;
    } else {
        console.debug('Use singleton Buzzer')
    }

    return Buzzer.instance;
}


