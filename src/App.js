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

//Load only if device supports orientation change API
const RequestPermissions = React.lazy(() => import('./RequestPermissions'));
const PanicMonger = React.lazy(() => import('./PanicMonger'));
const LogsContainer = React.lazy(() => import('./LogsContainer'));

Amplify.configure(awsmobile);

const useStyles = makeStyles(theme => {
    return new Styles(theme);
});

const {
    Frequency: {MIN_FREQUENCY, MAX_FREQUENCY, FREQUENCY_STEP},
    Volume: {MIN_VOLUME, MAX_VOLUME, VOLUME_STEP},
    Balance: {MIN_BALANCE, MAX_BALANCE, BALANCE_STEP}
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
    const [buzzer] = React.useState(new Buzzer({volumeLeft: 0.02, volumeRight: 0.02}, 0.0,
        1));

    const [volume, setVolume] = React.useState(
        {
            volumeLeft: buzzer.sound.left.volume,
            volumeRight: buzzer.sound.right.volume
        });

    const [frequency, setFrequency] = React.useState(buzzer.sound.frequency);
    const [balance, setBalance] = React.useState(buzzer.stereoEffect.pan);
    const [inlineConsoleVisible, setInlineConsoleVisible] = React.useState(false);
    const [deviceOrientationSupported, setDeviceOrientationSupported] = React.useState(null);
    const [deviceOrientation, setDeviceOrientation] = React.useState(null);
    const [deviceOrientationPermission, setDeviceOrientationPermission] = React.useState(null);

    /**
     * Check if device supports orientation change.
     * Run once.
     */
    useEffect(() => {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            setDeviceOrientationSupported(true);
        } else {
            setDeviceOrientationSupported(false);
            alert('Device doesn\'t support orientation change.');
        }
    }, []); //execute just once

    useEffect(() => {
        if (deviceOrientationPermission && deviceOrientationPermission !== 'granted') {
            alert('Permission declined.');
        }
    }, [deviceOrientationPermission]);

    const deviceOrientationRef = useRef({alpha: 0});

    useEffect(() => {
        if (deviceOrientationPermission) {
            if (deviceOrientationPermission === 'granted') {
                FULLTILT.getDeviceOrientation({
                    type: 'world'
                }).then((orientation) => {
                    orientation.start(() => {
                        const euler = orientation.getScreenAdjustedEuler();
                        const alphaNewValue = euler.alpha;
                        setDeviceOrientation({euler});
                        if (Math.abs(deviceOrientationRef.current.alpha - alphaNewValue) > 1) {
                            setDeviceOrientation({euler});
                            deviceOrientationRef.current.alpha = alphaNewValue;
                        }
                    });
                }).catch((error) => {
                    console.error(error);
                    alert(error);
                });
            }
        }
    }, [deviceOrientationPermission]);

    useEffect(() => {
        if (currentCoordinates && targetCoordinates) {
            const from = createLocation(Number(currentCoordinates?.lat),
                Number(currentCoordinates?.lng), 'LatLng');

            console.debug('From: ' + JSON.stringify(from));
            // (lat, lon) - format for Google maps
            let targetCoordinatesFormatted = targetCoordinates.startsWith('(') && targetCoordinates.endsWith(')') ?
                targetCoordinates.slice(1, targetCoordinates.length - 1) : targetCoordinates;

            let [targetLat, targetLng] = targetCoordinatesFormatted.split(',');

            const to = createLocation(parseFloat(targetLat),
                parseFloat(targetLng), 'LatLng');

            console.debug('To: ' + JSON.stringify(to));

            if (to && to.lat && to.lng) {
                let headingAndDistance = headingDistanceTo(from, to);
                setRequiredDirection(Math.round(normalizeHeading(headingAndDistance.heading)));
                setDistance(Number(headingAndDistance.distance.toFixed(1)));
                console.debug('Heading distance: ' + headingAndDistance.distance);
                setAccuracy(currentCoordinates.accuracy);
            }
        }
    }, [currentCoordinates, currentCoordinates?.lat, currentCoordinates?.lng, currentCoordinates?.accuracy,
        targetCoordinates]);

    const ref = useRef({userSoundSettings: {
            initFrequency: MIN_FREQUENCY
    }});

    useEffect(() => {
        if (explorationInProgress) {
            let turnAngle = requiredDirection - (360 - Math.round(deviceOrientation.euler.alpha));
            if (Math.abs(turnAngle) >= 180) {
                if (turnAngle >= 0) {
                    turnAngle -= 360;
                } else {
                    turnAngle += 360;
                }
            }
            const newNormalBalance = turnAngle / 180;
            const newBalance = Math.floor(newNormalBalance / BALANCE_STEP) * BALANCE_STEP;
            setBalance(newBalance);
            buzzer.setBalance(newBalance);
            if (distance) {
                let frequency = MAX_FREQUENCY / distance + ref.current.userSoundSettings.initFrequency;
                setFrequency(frequency);
                buzzer.frequency(frequency);
            }
        }
    }, [requiredDirection, deviceOrientation, distance, buzzer, explorationInProgress]);


    const handleStartStop = (event) => {
        let validCoords = coordsValid(targetCoordinates);
        setCoordinatesValid(validCoords);
        console.debug(`Coordinates [${targetCoordinates}] valid: ${validCoords}`);
        if (validCoords) {
            const userInitFrequency = ref.current.userSoundSettings.initFrequency;
            setFrequency(userInitFrequency);
            buzzer.frequency(userInitFrequency);
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
            if (coords.startsWith('(') && coords.endsWith(')')) { //copied from google maps
                coords = coords.substr(1, coords.length - 2);
            }
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
    const handleVolumeChange = (event, newValue, target) => {
        setVolume(previousState => {
            let modifiedStateValues = {[target]: newValue};
            let mergedState = {...previousState, ...modifiedStateValues};
            buzzer.volume(mergedState);

            return mergedState;
        });
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
     * @deprecated balance must not be managed by user
     * @param event
     * @param newValue
     */
    const handleBalanceChange = (event, newValue) => {
        buzzer.play();
        setBalance(newValue);
        buzzer.setBalance(newValue);
    }


    let dialog;
    if (deviceOrientationSupported) {
        dialog = <RequestPermissions permsRequired={deviceOrientationPermission !== 'granted'}
                                     callback={setDeviceOrientationPermission}/>;
    } else {
        dialog = null;
    }

    return (
        <React.Fragment>
            <CssBaseline/>
            <main className={classes.layout}>
                <Paper className={classes.paper}>
                    <Typography onDoubleClick={() => setInlineConsoleVisible(!inlineConsoleVisible)}
                                component="h1" variant="h4" align="center">
                        GPS
                    </Typography>
                    {explorationInProgress ? <LinearProgress variant='indeterminate'/> : null}
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
                                Volume Left
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item>
                                    <VolumeDown />
                                </Grid>
                                <Grid item xs>
                                    <Slider min={MIN_VOLUME} max={MAX_VOLUME} step={VOLUME_STEP}
                                            value={volume.volumeLeft}
                                            onChange={(e, v)=>handleVolumeChange(e,v,
                                                'volumeLeft')}
                                                aria-labelledby="continuous-slider" />
                                </Grid>
                                <Grid item>
                                    <VolumeUp />
                                </Grid>
                            </Grid>
                        </div>
                        <div>
                            <Typography gutterBottom>
                                Volume Right
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item>
                                    <VolumeDown />
                                </Grid>
                                <Grid item xs>
                                    <Slider min={MIN_VOLUME} max={MAX_VOLUME} step={VOLUME_STEP}
                                            value={volume.volumeRight}
                                            onChange={(e,v)=>handleVolumeChange(e,v,
                                                'volumeRight')} aria-labelledby="continuous-slider" />
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
                                            /*onChange={handleBalanceChange}*/ aria-labelledby="continuous-slider"
                                            /*onChangeCommitted={() => {
                                                buzzer.pause();
                                                ref.current.userSoundSettings.initBalance = balance;}}*/
                                            disabled={true} />
                                </Grid>
                                <Grid item>
                                    <ArrowRight />
                                </Grid>
                            </Grid>
                        </div>
                        <div className={classes.buttons}>
                            <Button onClick={handleStartStop} variant='contained' className={classes.button}
                                    disabled={!deviceOrientationSupported || deviceOrientationPermission !== 'granted'}>
                                {explorationInProgress ? 'Stop' : 'Start'}
                            </Button>
                        </div>
                    </React.Fragment>
                </Paper>
            </main>
            <React.Suspense fallback={<div>Loading...</div>}>
                <LogsContainer classes={classes} visible={inlineConsoleVisible} />
                <div>{dialog}</div>
                {
                    deviceOrientationSupported && deviceOrientationPermission === 'granted' &&
                    <PanicMonger callback={(event) => {
                        console.debug('Device shaked', Object.entries(event));
                        window.location.replace('http://google.ru');
                    }}/>
                }
            </React.Suspense>
        </React.Fragment>
    );
}

export default App;
