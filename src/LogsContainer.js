import React from 'react';
import { Hook, Console, Decode } from 'console-feed';

class LogsContainer extends React.Component {

    MAX_CONSOLE_LENGTH = 30;
    constructor(props) {
        super(props);
        this.state = {
            logs: [],
        };
        this.writeMessageToConsole = this.writeMessageToConsole.bind(this);
        Hook(window.console, this.writeMessageToConsole);
    }

    writeMessageToConsole(log) {
        this.setState((prevState, props) => {
            let newState = null;
            if (prevState.logs.length <= this.MAX_CONSOLE_LENGTH) {
                newState = {logs: [...prevState.logs, Decode(log)]};
            } else {
                newState = {logs: [Decode(log)]};
            }

            return newState;
        });
    }

    componentDidMount() {
        console.log('Inline console started...');
    }

    render() {
        const {classes} = this.props;
        if (this.props.visible) {
            return (<div className={classes.cons}>
                <Console logs={this.state.logs} variant="dark"
                         styles={
                             {
                                 LOG_COLOR: 'rgba(100,255,0,0.9)',
                                 LOG_DEBUG_COLOR: 'rgba(100,255,0,0.9)'
                             }}/>
            </div>);
        } else {
            return null;
        }
    }
}

export default LogsContainer;