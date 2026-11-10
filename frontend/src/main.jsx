// Starting point of the frontend.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { MessageProvider } from './components/Message.jsx';
import { SessionProvider } from './auth/SessionContext.jsx';
import App from './App.jsx';
import './style.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <HashRouter>
            <MessageProvider>
                <SessionProvider>
                    <App />
                </SessionProvider>
            </MessageProvider>
        </HashRouter>
    </StrictMode>
);
