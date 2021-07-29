import './App.css';
import Amplify from 'aws-amplify';
import Styles from './styles';
import {makeStyles} from '@material-ui/core/styles';
import React, {useEffect, useRef} from 'react';
import {CssBaseline, LinearProgress, TextField} from '@material-ui/core';
import {
    Toolbar,
    Typography,
    Button,
    Paper,
    AppBar,
    FormControl,
    FormHelperText
} from '@material-ui/core';

import {headingDistanceTo, createLocation} from 'geolocation-utils';
import awsmobile from './aws-exports';
import GpsTracker from "./GpsTracker";
import Buzzer from "./Buzzer";

Amplify.configure(awsmobile);

const useStyles = makeStyles(theme => {
    return new Styles(theme);
});

function App() {
    const [currentCoordinates, setCurrentCoordinates] = React.useState(null);
    const [targetCoordinates, setTargetCoordinates] = React.useState('');
    const [coordinatesValid, setCoordinatesValid] = React.useState(true);
    const [explorationInProgress, setExplorationInProgress] = React.useState(false);
    const [heading, setHeading] = React.useState(null);
    const classes = useStyles();
    const [buzzer] = React.useState(new Buzzer());

    useEffect(evalDistanceAndDirection, [currentCoordinates, targetCoordinates]);

    function evalDistanceAndDirection() {
        //hook is called first time for undefined currentCoordinates
        if (!currentCoordinates) {
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
            headingAndDistance[Symbol.for('accuracy')] = currentCoordinates.accuracy;
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

    return (
        <React.Fragment>
            <CssBaseline/>
            <AppBar position="absolute" color="default" className={classes.appBar}>
                <Toolbar>
                    <Typography variant="h6" color="inherit" noWrap>
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
                            <FormControl disabled={explorationInProgress}>
                                <TextField
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
                                    value={Math.round(heading?.heading)}
                                />
                            </FormControl>
                            <FormControl disabled>
                                <TextField
                                    id="target-distance"
                                    label="Target distance"
                                    helperText="Meters"
                                    value={`${heading?.distance?.toFixed(1)} +/- ${heading?.[Symbol.for('accuracy')]}`}
                                />
                            </FormControl>
                        </div>
                        <div>
                            <GpsTracker updateCoordinates={setCurrentCoordinates} />
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
