import React from 'react'
import { Hook, Console, Decode } from 'console-feed'

class LogsContainer extends React.Component {

    state = {
        logs: [],

    }

    componentDidMount() {
        Hook(window.console, (log) => {
            this.setState(({ logs }) => ({ logs: [...logs, Decode(log)] }))
        })

        console.log(`Console started...`)
    }

    render() {
        const {classes} = this.props;
        return (
            <div className={classes.cons}>
                <Console logs={this.state.logs} variant="dark" />
            </div>
        )
    }
}

export default LogsContainer;