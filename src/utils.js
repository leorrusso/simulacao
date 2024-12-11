export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const randomPosition = (gridSize) => ({
  x: Math.floor(Math.random() * gridSize),
  y: Math.floor(Math.random() * gridSize)
});

export const distance = (pos1, pos2) => {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  return Math.sqrt(dx * dx + dy * dy);
};

export const moveInGrid = (coord, delta, size) => {
  return (coord + delta + size) % size;
};
