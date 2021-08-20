import React from 'react'
import { Hook, Console, Decode } from 'console-feed'

class LogsContainer extends React.Component {

    MAX_CONSOLE_LENGTH = 30;

    state = {
        logs: [],

    }

    componentDidMount() {
        Hook(window.console, (log) => {
            if (this.state.logs.length > this.MAX_CONSOLE_LENGTH) {
                this.setState({logs: []});
            }
            this.setState(({ logs }) => {
                let newState = null;
                if (this.state.logs.length <= this.MAX_CONSOLE_LENGTH) {
                    newState = {logs: [...logs, Decode(log)]};
                } else {
                    newState = {logs: [Decode(log)]};
                }

                return newState;
            });
        })

        console.log(`Console started...`)
    }

    render() {
        const {classes} = this.props;
        return (
            <div className={classes.cons}>
                <Console logs={this.state.logs} variant="dark" styles={{LOG_COLOR: 'rgba(100,255,0,0.9)',
                    LOG_INFO_COLOR: 'rgba(100,255,0,0.9)'}}/>
            </div>
        )
    }
}

export default LogsContainer;