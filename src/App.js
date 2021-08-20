import LogsContainer from './LogsContainer';
import './App.css';
import Amplify from 'aws-amplify';
import Styles from './styles';
import {makeStyles} from '@material-ui/core/styles';
import React, {useEffect, useRef} from 'react';
import {VolumeDown, VolumeUp, ExpandMore, ExpandLess, ArrowLeft, ArrowRight} from '@material-ui/icons';
import {
    Toolbar,
    Typography,
    Button,
    Paper,
    AppBar,
    FormControl,
    FormHelperText,
    CssBaseline,
    LinearProgress,
    TextField,
    Slider,
    Grid
} from '@material-ui/core';

import {headingDistanceTo, createLocation, normalizeHeading} from 'geolocation-utils';
import awsmobile from './aws-exports';
import GpsTracker from "./GpsTracker";
import {BuzzerConstants, Buzzer} from "./Buzzer";
import {FULLTILT} from "fulltilt-ng";
import AppMessages from "./AppMessages";

Amplify.configure(awsmobile);

const useStyles = makeStyles(theme => {
    return new Styles(theme);
});

const {
    Frequency: {MIN_FREQUENCY, MAX_FREQUENCY, FREQUENCY_STEP},
    Volume: {MIN_VOLUME, MAX_VOLUME, VOLUME_STEP},
    Balance: {MIN_BALANCE, MAX_BALANCE, NORM_BALANCE, BALANCE_STEP}
} = BuzzerConstants;

function App() {
    const [requiredDirection, setRequiredDirection] = React.useState(0);
    const [distance, setDistance] = React.useState(0);
    const [accuracy, setAccuracy] = React.useState(0);
    const [currentCoordinates, setCurrentCoordinates] = React.useState(null);
    const [targetCoordinates, setTargetCoordinates] = React.useState(null);
    const [coordinatesValid, setCoordinatesValid] = React.useState(true);
    const [explorationInProgress, setExplorationInProgress] = React.useState(false);
    const classes = useStyles();
    const [buzzer] = React.useState(new Buzzer({volumeHi: 0.02, volumeFrequency: 1, balance: 0.0}));
    const [volume, setVolume] = React.useState(buzzer.sound.volume);
    const [frequency, setFrequency] = React.useState(buzzer.sound.frequency);
    const [balance, setBalance] = React.useState(buzzer.stereoEffect.pan);
    const [inlineConsoleVisible, setInlineConsoleVisible] = React.useState(false);
    const [deviceOrientation, setDeviceOrientation] = React.useState(null);
    const [deviceOrientationPermission, setDeviceOrientationPermission] = React.useState(null);
    const [messages] = React.useState({
        errors: [],
        warnings: [],
        infos: [],
        error(msg) {
            this.errors.push(msg);
        },
        warn(msg) {
            this.warnings.push(msg);
        },
        info(msg) {
            this.infos.push(msg);
        }
    });
    const deviceOrientationRef = useRef({alpha: 0});
    useEffect(() => {
        const errorMsgSystemIncompatible = "Current device does not support orientation change.";
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {

            DeviceOrientationEvent.requestPermission().then(async permState => {
                if (permState !== 'granted') {
                    messages.error('Permission denied by user.')
                }
                setDeviceOrientationPermission(permState);
            });
        } else if (!messages.errors.includes(errorMsgSystemIncompatible)) {
            messages.error(errorMsgSystemIncompatible);
        }
    });

    useEffect(() => {
        if (deviceOrientationPermission) {
            if (deviceOrientationPermission === 'granted') {
                try {
                    FULLTILT.getDeviceOrientation({
                        type: 'world'
                    }).then((orientation) => {
                        if (orientation) {
                            const euler = orientation.getScreenAdjustedEuler();
                            const alphaNewValue = euler.alpha;

                            if (Math.abs(deviceOrientationRef.current.alpha - alphaNewValue) > 1) {
                                setDeviceOrientation({euler});
                                deviceOrientationRef.current.alpha = alphaNewValue;
                            }
                        }
                    });
                } catch (e) {
                    console.error('Device orientation error', e);
                    messages.error('Device orientation error: ' + e);
                }
            }
        }
    }); //[]); //empty array means execute once after component render

    const ref = useRef({userSoundSettings: {
        initFrequency: MIN_FREQUENCY, initBalance: NORM_BALANCE
        }});

    useEffect(() => {
        if (currentCoordinates && targetCoordinates) {
            const from = createLocation(Number(currentCoordinates?.lat),
                Number(currentCoordinates?.lng), 'LatLng');

            console.debug('From: ' + JSON.stringify(from));

            const [targetLat, targetLng] = targetCoordinates.split(',');
            const to = createLocation(parseFloat(targetLat),
                parseFloat(targetLng), 'LatLng');

            console.debug('To: ' + JSON.stringify(to));

            let headingAndDistance = headingDistanceTo(from, to);
            if (headingAndDistance) {
                setRequiredDirection(Math.round(normalizeHeading(headingAndDistance.heading)));
                setDistance(Number(headingAndDistance.distance.toPrecision(1)));
                console.debug('Heading distance: ' + headingAndDistance.distance);
                setAccuracy(currentCoordinates.accuracy);
            }
        }
    }, [targetCoordinates, currentCoordinates]);

    useEffect(() => {
        if (explorationInProgress) {
            const newBalance = (requiredDirection - (360 - Math.round(deviceOrientation.euler.alpha))) / 360;
            setBalance(newBalance);
            buzzer.setBalance(newBalance);
            if (distance) {
                let frequency = MAX_FREQUENCY / distance + ref.current.userSoundSettings.initFrequency;
                console.debug('New frequency: ' + frequency);
                setFrequency(frequency);
                buzzer.frequency(frequency);
                console.debug(`Set frequency=${frequency} for distance=${distance}`);
            }
        }
    }, [requiredDirection, distance, buzzer, explorationInProgress, deviceOrientation]);


    const handleStartStop = (event) => {
        let validCoords = coordsValid(targetCoordinates);
        setCoordinatesValid(validCoords);
        console.debug(`Coordinates [${targetCoordinates}] valid: ${validCoords}`);
        if (validCoords) {
            const userInitFrequency = ref.current.userSoundSettings.initFrequency;
            setFrequency(userInitFrequency);
            buzzer.frequency(userInitFrequency);
            const userInitBalance = ref.current.userSoundSettings.initBalance;
            setBalance(userInitBalance);
            buzzer.setBalance(userInitBalance);

            if (explorationInProgress) {
                buzzer.stop();
            } else {
                buzzer.play();
            }
            setExplorationInProgress(!explorationInProgress);
        }
    };

    const coordsValid = (coords) => {
        let isValid = true;
        try {
            let [lat, lng] = coords.split(',');
            lat = parseFloat(lat);
            lng = parseFloat(lng);
            isValid = !isNaN(lat) && !isNaN(lng);
        } catch (e) {
            console.debug(`Target coordinates ${coords} invalid! ${e}`);
            isValid = false;
        } finally {
            return isValid;
        }
    };

    /**
     * Slider action.
     *
     * @param event
     * @param newValue
     */
    const handleVolumeChange = (event, newValue) => {
        setVolume(newValue);
        buzzer.volume(newValue);
    }

    /**
     * Slider action.
     *
     * @param event
     * @param newValue
     */
    const handleFrequencyChange = (event, newValue) => {
        buzzer.play();
        setFrequency(newValue);
        buzzer.frequency(newValue);
    }

    /**
     * Slider action.
     *
     * @param event
     * @param newValue
     */
    const handleBalanceChange = (event, newValue) => {
        buzzer.play();
        setBalance(newValue);
        buzzer.setBalance(newValue);
    }

    return (
        <React.Fragment>
            <CssBaseline/>
            <AppBar position="absolute" color="default" className={classes.appBar}>
                <Toolbar>
                    <Typography id="sonarNavigatorAppName" variant="h6" color="inherit" noWrap onDoubleClick={() => setInlineConsoleVisible(!inlineConsoleVisible)}>
                        Sonar Navigator
                    </Typography>
                </Toolbar>
                {explorationInProgress ? <LinearProgress variant='indeterminate'/> : null}
            </AppBar>
            <main className={classes.layout}>
                <Paper className={classes.paper}>
                    <Typography component="h1" variant="h4" align="center">
                        GPS
                    </Typography>
                    <AppMessages errors={messages.errors} warnings={messages.warnings} infos={messages.infos}/>
                    <React.Fragment>
                        <div>
                            <FormControl>
                                <TextField
                                    disabled={explorationInProgress}
                                    onChange={(event) => {
                                        setTargetCoordinates(event.target.value);
                                    }
                                    }
                                    error={!coordinatesValid}
                                    id="target-coords"
                                    label="Target coordinates"
                                    defaultValue=""
                                    helperText={!coordinatesValid ? 'Coordinates must be set in form: 51.65408611111111, 39.192727777777776' : ''}
                                />
                                <FormHelperText id="target-coords-helper-text">Your destination won't be stored
                                    anywhere</FormHelperText>
                            </FormControl>
                        </div>
                        <div>
                            <FormControl disabled>
                                <TextField
                                    id="target-direction"
                                    label="Target direction"
                                    helperText="Degrees"
                                    value={requiredDirection}
                                />
                            </FormControl>
                            <FormControl disabled>
                                <TextField
                                    id="target-distance"
                                    label="Target distance"
                                    helperText="Meters"
                                    value={`${distance} +/- ${accuracy}`}
                                />
                            </FormControl>
                        </div>
                        <div>
                            <FormControl disabled>
                                <TextField
                                    id="device-orientation"
                                    label="Compass heading"
                                    value={deviceOrientation ? 360 - Math.round(deviceOrientation.euler.alpha) : 'N/A'}
                                />
                            </FormControl>
                        </div>
                        <div>
                            <GpsTracker updateCoordinates={setCurrentCoordinates} />
                        </div>
                        <div>
                            <Typography gutterBottom>
                                Volume
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item>
                                    <VolumeDown />
                                </Grid>
                                <Grid item xs>
                                    <Slider min={MIN_VOLUME} max={MAX_VOLUME} step={VOLUME_STEP} value={volume}
                                            onChange={handleVolumeChange} aria-labelledby="continuous-slider" />
                                </Grid>
                                <Grid item>
                                    <VolumeUp />
                                </Grid>
                            </Grid>
                        </div>
                        <div>
                            <Typography gutterBottom>
                                Frequency
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item>
                                    <ExpandMore />
                                </Grid>
                                <Grid item xs>
                                    <Slider min={MIN_FREQUENCY} max={MAX_FREQUENCY - 1} step={FREQUENCY_STEP} value={frequency}
                                            disabled={explorationInProgress}
                                            onChange={handleFrequencyChange}
                                            onChangeCommitted={() => {
                                                buzzer.pause();
                                                ref.current.userSoundSettings.initFrequency = frequency;
                                            }} aria-labelledby="continuous-slider" />
                                </Grid>
                                <Grid item>
                                    <ExpandLess />
                                </Grid>
                            </Grid>
                        </div>
                        <div>
                            <Typography gutterBottom>
                                Balance
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item>
                                    <ArrowLeft />
                                </Grid>
                                <Grid item xs>
                                    <Slider min={MIN_BALANCE} max={MAX_BALANCE} step={BALANCE_STEP} value={balance}
                                            onChange={handleBalanceChange} aria-labelledby="continuous-slider"
                                            onChangeCommitted={() => {
                                                buzzer.pause();
                                                ref.current.userSoundSettings.initBalance = balance;}}
                                            disabled={explorationInProgress} />
                                </Grid>
                                <Grid item>
                                    <ArrowRight />
                                </Grid>
                            </Grid>
                        </div>
                        <div className={classes.buttons}>
                            <Button onClick={handleStartStop} variant='contained' className={classes.button}
                                    disabled={Boolean(messages.errors.length)}>
                                {explorationInProgress ? 'Stop' : 'Start'}
                            </Button>
                        </div>
                    </React.Fragment>
                </Paper>
            </main>
            {
                inlineConsoleVisible &&
                <LogsContainer classes={classes}/>
            }
        </React.Fragment>
    );
}

export default App;
