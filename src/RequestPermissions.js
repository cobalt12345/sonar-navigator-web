import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import {useTheme} from "@material-ui/core/styles";

export default function RequestPermissions(props) {
    const [open, setOpen] = React.useState(props.permsRequired);
    const callBackFunction = props.callback;
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const disagree = () => {
        callBackFunction('denied');
        setOpen(false);
    };

    const agree = () => {
        DeviceOrientationEvent.requestPermission().then(permState => {
            callBackFunction(permState);
        });
        setOpen(false);
    };

    return (
        <div>
            <Dialog
                fullScreen={fullScreen}
                open={open}
                aria-labelledby="request-permissions-dialog-title"
            >
                <DialogTitle id="request-permissions-dialog-title">{"Use device orientation?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Let the Application help to determine a location using the device orientation service.
                        You can shake the device to remove all private data and close the program.
                        No data will be sent to anywhere!
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={disagree} color="secondary">
                        Disagree
                    </Button>
                    <Button onClick={agree} color="primary" autoFocus >
                        Agree
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}