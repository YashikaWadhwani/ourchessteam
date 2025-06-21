import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';

function App() {
  const [game, setGame] = useState(new Chess());
  const [boardWidth] = useState(600);
  const socket = useRef();

  useEffect(() => {
    socket.current = io('http://localhost:5000');
    socket.current.emit('joinGame', 'default-room');
    
    socket.current.on('gameState', ({ fen }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
    });

    socket.current.on('moveMade', ({ fen }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
    });

    return () => socket.current.disconnect();
  }, []);

  function onDrop(source, target) {
    try {
      const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
      });
      
      if (move) {
        socket.current.emit('makeMove', {
          gameId: 'default-room',
          move
        });
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Online Chess Team</h1>
      <Chessboard 
        position={game.fen()} 
        onPieceDrop={onDrop}
        boardWidth={boardWidth}
      />
    </div>
  );
}

export default App;

//trial