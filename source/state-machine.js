"use strict";
(function (State) {
    State[State["Loading"] = 0] = "Loading";
    State[State["AccountPossiblyConnected"] = 1] = "AccountPossiblyConnected";
    State[State["AccountConnected"] = 2] = "AccountConnected";
    State[State["AccountNotConnected"] = 3] = "AccountNotConnected";
    State[State["StartingSession"] = 4] = "StartingSession";
    State[State["SessionStarted"] = 5] = "SessionStarted";
    State[State["LibraryLoaded"] = 6] = "LibraryLoaded";
    State[State["SessionError"] = 7] = "SessionError";
})(exports.State || (exports.State = {}));
var State = exports.State;
;
function transitions(s) {
    if (s === State.Loading)
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
