import '../rainbow-line.js';
import {describeRainbowLine} from './rainbowLineBehaviour.js';

// loads the worker from the separate rainbow-line.worker.js next to it
describeRainbowLine('rainbow-line.js + rainbow-line.worker.js');
