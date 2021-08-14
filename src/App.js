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

import {headingDistanceTo, createLocation} from 'geolocation-utils';
import awsmobile from './aws-exports';
import GpsTracker from "./GpsTracker";
import {BuzzerConstants, Buzzer} from "./Buzzer"
import {createConsole} from './inlineConsole';

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
    const [currentCoordinates, setCurrentCoordinates] = React.useState(null);
    const [targetCoordinates, setTargetCoordinates] = React.useState(null);
    const [coordinatesValid, setCoordinatesValid] = React.useState(true);
    const [explorationInProgress, setExplorationInProgress] = React.useState(false);
    const [heading, setHeading] = React.useState(null);
    const classes = useStyles();
    const [buzzer] = React.useState(new Buzzer({volumeHi: 0.02, volumeFrequency: 1, balance: 0.0}));
    const [volume, setVolume] = React.useState(buzzer.sound.volume);
    const [frequency, setFrequency] = React.useState(buzzer.sound.frequency);
    const [balance, setBalance] = React.useState(buzzer.stereoEffect.pan);
    const [inlineConsoleVisible, setInlineConsoleVisible] = React.useState(false);
    const ref = useRef({inlinedConsole: undefined, inlineConsoleVisible: false, userSoundSettings: {
        initFrequency: MIN_FREQUENCY, initBalance: NORM_BALANCE
        }});

    // useEffect(evalDistanceAndDirection, [targetCoordinates]);
    // useEffect(handleCurrentPositionChanged, [currentCoordinates]);

    // useEffect(() => {
    //     const inlineConsole = createConsole();
    //     document.body.appendChild(inlineConsole);
    //     ref.current.inlineConsoleVisible = inlineConsoleVisible;
    //     ref.current.inlinedConsole = inlineConsole;
    //     const appName = document.querySelector("#sonarNavigatorAppName");
    //     appName ? appName.addEventListener('dblclick', (event) => {
    //         showHideConsole();
    //         }) :
    //         console.warn('Inline console cannot be attached.');
    //
    //     return function cleanup() {appName.removeEventListener('dblclick', (event) => showHideConsole())}
    // });

    function showHideConsole() {
        const prevConsoleState = ref.current;
        if (prevConsoleState.inlineConsoleVisible) {
            prevConsoleState.inlinedConsole.setAttribute('hidden', 'true');
        } else {
            prevConsoleState.inlinedConsole.removeAttribute('hidden');
        }

        ref.current.inlinedConsole = prevConsoleState.inlinedConsole;
        ref.current.inlineConsoleVisible = !prevConsoleState.inlineConsoleVisible;

        setInlineConsoleVisible(ref.current.inlineConsoleVisible);
    }

    function handleCurrentPositionChanged() {
        //update heading state to get correct direction & distance
        evalDistanceAndDirection();
        const direction = getDirection();
        const newBalance = direction / 180;
        console.debug(`${direction} / 180 = ${newBalance}`);
        setBalance(newBalance);
        buzzer.setBalance(newBalance);
        const distance = getDistance();
        if (distance) {
            let frequency = (MAX_FREQUENCY - ref.current.userSoundSettings.initFrequency) / distance;
            console.debug('New frequency: ' + frequency);
            setFrequency(frequency);
            buzzer.frequency(frequency);
            console.debug(`Set frequency=${frequency} for distance=${distance}`);
        }

        return function cleanUp() {};
    }

    /**
     * Current method is called each time either current or target position is changed.
     *
     * @returns {function()}
     */
    function evalDistanceAndDirection() {
        //hook is called first time for undefined currentCoordinates
        if (!currentCoordinates || !targetCoordinates) {
            return;
        }
        const from = createLocation(Number(currentCoordinates?.lat),
            Number(currentCoordinates?.lng), 'LatLng');

        console.debug('From: ' + JSON.stringify(from));
        const [targetLat, targetLng] = targetCoordinates.split(',');
        const to = createLocation(parseFloat(targetLat),
            parseFloat(targetLng), 'LatLng');

        console.debug('To: ' + JSON.stringify(to));

        let headingAndDistance = headingDistanceTo(from, to)
        if (headingAndDistance) {
            headingAndDistance[Symbol.for('accuracy')] = currentCoordinates.accuracy.toFixed(1);
            setHeading(headingAndDistance);
        }

        return function cleanUp() {};
    }

    const handleStartStop = (event) => {
        let validCoords = coordsValid(targetCoordinates);
        setCoordinatesValid(validCoords);
        console.debug(`Coordinates [${targetCoordinates}] valid: ${validCoords}`);
        if (validCoords) {
            if (explorationInProgress) {
                buzzer.stop();
            } else {
                const startDistance = getDistance();
                const userInitFrequency = ref.current.userSoundSettings.initFrequency;
                setFrequency(userInitFrequency);
                buzzer.frequency(userInitFrequency);
                const userInitBalance = ref.current.userSoundSettings.initBalance;
                setBalance(userInitBalance);
                buzzer.setBalance(userInitBalance);
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

    /**
     * Get direction from heading.
     *
     * @returns {number|number}
     */
    function getDirection() {
        let direction = (heading && heading.heading) ? Math.round(heading.heading) : 0;

        return direction;
    }

    /**
     * Get distance from calculated heading.
     *
     * @returns {number|number}
     */
    function getDistance() {
        let distance = (heading && heading.distance) ? Number(heading.distance.toFixed(1)) : 0;

        return distance;
    }

    return (
        <React.Fragment>
            <CssBaseline/>
            <AppBar position="absolute" color="default" className={classes.appBar}>
                <Toolbar>
                    <Typography id="sonarNavigatorAppName" variant="h6" color="inherit" noWrap onClick={() => setInlineConsoleVisible(!inlineConsoleVisible)}>
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
                                    value={getDirection()}
                                />
                            </FormControl>
                            <FormControl disabled>
                                <TextField
                                    id="target-distance"
                                    label="Target distance"
                                    helperText="Meters"
                                    value={`${getDistance()} +/- ${Math.round(heading?.[Symbol.for('accuracy')])}`}
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
                            <Button onClick={handleStartStop} variant='contained' className={classes.button}>
                                {explorationInProgress ? 'Stop' : 'Start'}
                            </Button>
                        </div>
                    </React.Fragment>
                </Paper>
            </main>
        </React.Fragment>
    );
}

export default App;
