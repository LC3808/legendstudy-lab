import {createGa4Runtime} from './ga4-runtime.js';
import {homeAnalyticsConfig} from './analytics-config.js';
import {installHomeAnalytics} from './analytics.js';
installHomeAnalytics(window, createGa4Runtime(homeAnalyticsConfig, window));
