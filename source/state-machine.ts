export enum State {
    Loading,
    NotWelcomed,
    AccountPossiblyConnected,
    AccountConnected,
    AccountNotConnected,
    StartingSession,
    SessionStarted,
    LibraryLoaded,
    SessionError
};

export function transitions(s:State):State[] {
    if (s === State.Loading) return [State.NotWelcomed, State.AccountPossiblyConnected];
    if (s === State.NotWelcomed) return [State.AccountPossiblyConnected];
    if (s === State.AccountPossiblyConnected) return [State.AccountConnected, State.AccountNotConnected];
    if (s === State.AccountConnected) return [State.StartingSession];
    if (s === State.AccountNotConnected) return [State.StartingSession];
    if (s === State.StartingSession) return [State.SessionStarted, State.SessionError];
    if (s === State.SessionStarted) return [State.LibraryLoaded, State.SessionError];
    if (s === State.LibraryLoaded) return [State.SessionError];
    if (s === State.SessionError) return [State.StartingSession];
    return [];
}
