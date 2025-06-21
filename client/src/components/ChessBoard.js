import React, { useEffect, useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';

export default function ChessBoard({ gameId, orientation = 'white' }) {
  const [game, setGame] = useState(new Chess());
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io(process.env.REACT_APP_API_URL);
    socket.current.emit('joinGame', gameId);

    socket.current.on('gameState', (fen) => {
      setGame(new Chess(fen));
    });

    return () => {
      socket.current.disconnect();
    };
  }, [gameId]);

  function onDrop(sourceSquare, targetSquare) {
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // always promote to queen for simplicity
    };

    try {
      const gameCopy = new Chess(game.fen());
      gameCopy.move(move);
      setGame(gameCopy);
      socket.current.emit('makeMove', { gameId, move });
      return true;
    } catch (e) {
      return false;
    }
  }

  return (
    <div className="chess-board-container">
      <Chessboard 
        position={game.fen()} 
        onPieceDrop={onDrop}
        boardOrientation={orientation}
        boardWidth={600}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
        }}
      />
    </div>
  );
}