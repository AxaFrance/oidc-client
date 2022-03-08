import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.render(<App />, document.getElementById('root'));

window.onerror = function (msg, url, line) {
    alert("Message : " + msg );
    alert("url : " + url );
    alert("Line number : " + line );
}