import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { appConfig } from './config/appConfig';
import { setupGlobalErrorHandlers } from './lib/errors';
import './index.css';

setupGlobalErrorHandlers();
document.title = appConfig.appTitle;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
