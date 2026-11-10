// The green (ok) / red (error) message in the top-right corner, shown for a few seconds.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const MessageContext = createContext(() => {});

export function MessageProvider({ children }) {
    const [message, setMessage] = useState({ text: '', isError: false, visible: false });
    const timer = useRef(null);

    const showMessage = useCallback((text, isError) => {
        setMessage({ text: text, isError: !!isError, visible: true });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setMessage(m => ({ ...m, visible: false })), 5000);
    }, []);

    useEffect(() => () => clearTimeout(timer.current), []);

    return (
        <MessageContext.Provider value={showMessage}>
            {children}
            <div id="message" className={'message ' + (message.isError ? 'error' : 'ok')} hidden={!message.visible}>
                {message.text}
            </div>
        </MessageContext.Provider>
    );
}

/** showMessage(text, isError) */
export function useMessage() {
    return useContext(MessageContext);
}
