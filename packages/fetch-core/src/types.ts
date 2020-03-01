interface OidcHistory {
  push: (url?: string | null, stateHistory?: any) => void;
}
