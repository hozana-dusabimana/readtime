// Who is logged in, shared by all pages.
// On start: if a token is saved, GET /api/me logs the user in again (a refresh keeps you logged in).
// IMPORTANT: the BACKEND checks every permission. Showing different pages per role
// here only makes the screen tidier; it is not the security.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { getToken, setToken } from './token.js';
import { useMessage } from '../components/Message.jsx';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
    const [user, setUserState] = useState(null);
    const [ready, setReady] = useState(false);
    const userRef = useRef(null);   // read by run() without re-creating it on every login/logout

    const setUser = useCallback(u => {
        userRef.current = u;
        setUserState(u);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            let me = null;
            if (getToken()) {
                try {
                    me = await api('GET', '/api/me');
                } catch (e) {
                    setToken(null);   // token expired or invalid
                }
            }
            if (!cancelled) {
                setUser(me);
                setReady(true);
            }
        })();
        return () => { cancelled = true; };
    }, [setUser]);

    /** Called by the login and signup pages after a successful login. */
    const login = useCallback((token, u) => {
        setToken(token);
        setUser(u);
    }, [setUser]);

    const value = { user, setUser, ready, login, userRef };
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
    return useContext(SessionContext);
}

/**
 * Returns run(action, successText): runs an action; shows successText if it works,
 * or the error message if it fails. Resolves to true / false.
 */
export function useRun() {
    const showMessage = useMessage();
    const { userRef } = useSession();
    return useCallback(async (action, successText) => {
        try {
            await action();
            if (successText) showMessage(successText, false);
            return true;
        } catch (e) {
            // A page that was still loading when the user logged out gets "401 not logged in".
            // That is expected, so we do not show it.
            if (e.status === 401 && !userRef.current) return false;
            showMessage(e.message, true);
            return false;
        }
    }, [showMessage, userRef]);
}

/**
 * Loads a page's data once when the page opens.
 * Returns { data, setData, reload }. data is null while loading (and stays null when loading
 * failed - the error is shown as a message, like every other error).
 * reload() loads again and throws on failure, so it can be awaited inside run().
 */
export function useLoad(loader) {
    const run = useRun();
    const [data, setData] = useState(null);
    const loaderRef = useRef(loader);
    loaderRef.current = loader;
    const mounted = useRef(true);

    const reload = useCallback(async () => {
        const result = await loaderRef.current();
        if (mounted.current) setData(result);
        return result;
    }, []);

    useEffect(() => {
        mounted.current = true;
        run(reload);
        return () => { mounted.current = false; };
    }, [run, reload]);

    return { data, setData, reload };
}
