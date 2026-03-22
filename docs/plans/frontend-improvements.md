# Frontend Improvements

Analysis of the current frontend state as of 2026-03-22. These are identified issues, not a strict roadmap — pick items as they become relevant.

---

## High Priority

### 1. `useSocketEvent` custom hook — App.tsx
The same `useEffect` pattern for subscribing/unsubscribing to socket events is repeated 5+ times in `App.tsx`:
```typescript
useEffect(() => {
  socketService.subscribeToEvent('event', listener);
  return () => socketService.unsubscribeFromEvent('event', listener);
}, []);
```
Extract to a `useSocketEvent(eventName, handler)` hook.

### 2. `<FilterDropdown />` component — App.tsx (~lines 263-331)
The Playlist and Group dropdowns are near-identical. Extract a reusable `<FilterDropdown />` component (~80 lines saved).

### 3. `<PlaylistInputMethodTabs />` component — ChannelModal.tsx (~lines 380-501)
The three input method selectors (URL / Text / File) each repeat the same tab button structure. Extract into a component (~100 lines saved).

### 4. Mode radio buttons — ChannelModal.tsx (~lines 324-358, 510-544)
Mode selection is duplicated between channel mode and playlist mode. Extract a `<ModeSelector />` component.

### 5. `ensureConnected()` — SocketService.ts
The connection guard pattern is repeated 8 times across socket methods:
```typescript
if (!this.socket || !this.socket.connected) {
  this.connect();
  if (!this.socket || !this.socket.connected) {
    throw new Error('Socket is not connected.');
  }
}
```
Extract to a private `ensureConnected()` method.

---

## Medium Priority

### 6. Split `VideoPlayer.tsx` effect (~lines 71-256)
A 186-line `useEffect` handles HLS setup, sync logic, and error handling all at once. Split into:
- A hook for HLS initialization
- A hook for sync logic
- Utility functions for delay/deviation math

### 7. `<Modal />` wrapper component
Every modal re-implements the same overlay pattern:
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50">
  <div className="bg-gray-800 rounded-lg">...</div>
</div>
```
Extract a generic `<Modal isOpen onClose>` wrapper.

### 8. `<FormInput />` component
The same Tailwind input classes are copy-pasted across `LoginPage.tsx`, `ChannelModal.tsx`, and `UserManagement.tsx`. Extract a reusable styled input.

### 9. Centralize magic numbers
Scattered hardcoded values that should be named constants:
- `VideoPlayer.tsx`: 2000ms delay, 20000ms timeout
- `ChannelModal.tsx`: placeholder URLs

### 10. Fix `JSON.stringify` deep equality — App.tsx (~line 120)
```typescript
JSON.stringify(selectedChannel?.headers) != JSON.stringify(updatedChannel.headers)
```
Order-dependent and fragile. Replace with a proper deep-equality function.

---

## Lower Priority

### 11. `window.location.reload()` hack — App.tsx (~lines 124-127)
Hardcoded 3000ms delay before reloading for m3u8 refresh. Acknowledged TODO. Should be replaced with a proper backend-driven event or polling strategy.

### 12. `crypto.randomUUID()` for toast IDs — ToastContext.tsx (~line 25)
```typescript
const id = Math.random().toString(36).substring(2, 9);
```
Replace with `crypto.randomUUID()` for guaranteed uniqueness.

### 13. Reduce props drilling in App.tsx
`AppMain` holds all state and passes it down as props. If the component grows, consider moving channel/filter state into a context or a `useChannels()` hook.

### 14. Error handling consistency
No uniform strategy across components:
- `VideoPlayer.tsx` — logs to console
- `UserManagement.tsx` — try/catch with `err instanceof Error`
- `LoginPage.tsx` — catch-all without logging

---

## What's Working Well (don't fix)

- Service/context separation (`ApiService`, `SocketService`, `AdminContext`, `ToastContext`) is clean
- TypeScript usage is proper, not fought
- Chat components (`SendMessage`, `ReceivedMessage`, `SystemMessage`) are simple and well-scoped
- File organization by feature is sensible
- Form validation in ChannelModal (M3U file upload) is solid
