interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: string;
}

export default function OnlineStatus({ isOnline, lastSeen }: OnlineStatusProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isOnline ? '#2e7d32' : '#666' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isOnline ? '#4caf50' : '#ccc' }} />
      <span>{isOnline ? 'Online' : lastSeen ? `Last seen ${new Date(lastSeen).toLocaleString()}` : 'Offline'}</span>
    </div>
  );
}
