import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function GameRoom({ gameId }) => {
  const { user } = useAuth();
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState('Connecting...');
  const [players, setPlayers] = useState({ white: null, black: null });
  const [timeLeft, setTimeLeft] = useState({ white: 300, black: 300 });
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_API_URL, {
      auth: { token: localStorage.getItem('token') },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Game state updates
    socketRef.current.on('gameState', (gameState) => {
      const chess = new Chess(gameState.fen);
      setGame(chess);
      setPlayers(gameState.players);
      setStatus(gameState.turn === 'w' ? `${players.white?.username}'s turn (White)` : `${players.black?.username}'s turn (Black)`);
    });

    // Game end
    socketRef.current.on('gameEnded', (result) => {
      setStatus(result.winner 
        ? `Game over! ${result.winner.username} wins!` 
        : 'Game ended in a draw');
    });

    // Player activity
    socketRef.current.on('playerActivity', ({ type, username }) => {
      setStatus(`${username} ${type === 'join' ? 'joined' : 'left'} the game`);
    });

    // Errors
    socketRef.current.on('error', (msg) => {
      setStatus(`Error: ${msg}`);
    });

    // Join game room
    socketRef.current.emit('joinGame', gameId);

    // Load initial game data
    const loadGame = async () => {
      try {
        const res = await axios.get(`/api/v1/games/${gameId}`);
        const chess = new Chess(res.data.fen);
        setGame(chess);
        setPlayers({
          white: res.data.whitePlayer,
          black: res.data.blackPlayer
        });
        setStatus(chess.turn() === 'w' ? 'White to move' : 'Black to move');
      } catch (err) {
        setStatus('Failed to load game');
      }
    };
    loadGame();

    // Timer logic
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const turn = game.turn();
        return {
          ...prev,
          [turn]: Math.max(0, prev[turn] - 1)
        };
      });
    }, 1000);

    // Cleanup
    return () => {
      socketRef.current.disconnect();
      clearInterval(timerRef.current);
    };
  }, [gameId]);

  const onDrop = (sourceSquare, targetSquare) => {
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    };

    try {
      const gameCopy = new Chess(game.fen());
      gameCopy.move(move);
      socketRef.current.emit('makeMove', { 
        gameId, 
        move 
      });
      return true;
    } catch (err) {
      return false;
    }
  };

  return (
    <div className="game-room">
      <div className="game-header">
        <div className="player-info white">
          <img src={players.white?.avatar} alt={players.white?.username} />
          <span>{players.white?.username || 'Waiting...'}</span>
          <div className="timer">{formatTime(timeLeft.white)}</div>
        </div>
        
        <div className="game-status">{status}</div>
        
        <div className="player-info black">
          <img src={players.black?.avatar} alt={players.black?.username} />
          <span>{players.black?.username || 'Waiting...'}</span>
          <div className="timer">{formatTime(timeLeft.black)}</div>
        </div>
      </div>

      <div className="chess-board">
        <Chessboard 
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={600}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
          }}
          customDarkSquareStyle={{ backgroundColor: '#779556' }}
          customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
        />
      </div>

      <div className="game-controls">
        <button onClick={() => socketRef.current.emit('offerDraw', gameId)}>
          Offer Draw
        </button>
        <button onClick={() => socketRef.current.emit('resign', gameId)}>
          Resign
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}