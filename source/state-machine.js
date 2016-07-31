"use strict";
(function (State) {
    State[State["Loading"] = 0] = "Loading";
    State[State["NotWelcomed"] = 1] = "NotWelcomed";
    State[State["AccountPossiblyConnected"] = 2] = "AccountPossiblyConnected";
    State[State["AccountConnected"] = 3] = "AccountConnected";
    State[State["AccountNotConnected"] = 4] = "AccountNotConnected";
    State[State["StartingSession"] = 5] = "StartingSession";
    State[State["SessionStarted"] = 6] = "SessionStarted";
    State[State["LibraryLoaded"] = 7] = "LibraryLoaded";
    State[State["SessionError"] = 8] = "SessionError";
})(exports.State || (exports.State = {}));
var State = exports.State;
;
function transitions(s) {
    if (s === State.Loading)
        return [State.NotWelcomed, State.AccountPossiblyConnected];
    if (s === State.NotWelcomed)
        return [State.AccountPossiblyConnected];
    if (s === State.AccountPossiblyConnected)
        return [State.AccountConnected, State.AccountNotConnected];
    if (s === State.AccountConnected)
        return [State.StartingSession];
    if (s === State.AccountNotConnected)
        return [State.StartingSession];
    if (s === State.StartingSession)
        return [State.SessionStarted, State.SessionError];
    if (s === State.SessionStarted)
        return [State.LibraryLoaded, State.SessionError];
    if (s === State.LibraryLoaded)
        return [State.SessionError];
    if (s === State.SessionError)
        return [State.StartingSession];
    return [];
}
exports.transitions = transitions;
