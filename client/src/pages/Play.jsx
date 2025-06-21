import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useState } from "react";

export default function Play() {
  const [game, setGame] = useState(new Chess());

  function onDrop(sourceSquare, targetSquare) {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // Auto-queen for simplicity
    });

    if (move) {
      setGame(new Chess(game.fen()));
      return true;
    }
    return false; // Illegal move
  }

  return <Chessboard position={game.fen()} onPieceDrop={onDrop} />;
}

import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

// Add inside onDrop():
socket.emit('move', { from: sourceSquare, to: targetSquare });

// Add this hook:
useEffect(() => {
  socket.on('move', (move) => {
    const newGame = new Chess(game.fen());
    newGame.move(move);
    setGame(newGame);
  });
}, [game]);