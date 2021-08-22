import React from "react";
import {Alert} from "@material-ui/lab";


export default class AppMessages extends React.Component {

    render() {
        const errors = Array.from(new Set(this.props.errors)).map((error, index) =>
            <Alert severity='error' key={index}>{error}</Alert>);

        const warnings = Array.from(new Set(this.props.warnings)).map((warning, index) =>
            <Alert severity='warning' key={index}>{warning}</Alert>);

        const infos = Array.from(new Set(this.props.infos)).map((info, index) =>
            <Alert severity='info' key={index}>{info}</Alert>);

        return (
            <React.Fragment>
                {errors}
                {warnings}
                {infos}
            </React.Fragment>
        );
    }
}
