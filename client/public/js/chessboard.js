import { Chess } from 'chess.js';
import { Chessboard } from 'chessboardjsx';

const LiveChessBoard = ({ gameId }) => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io(process.env.REACT_APP_SERVER_URL);
    socket.current.emit('join-game', gameId);
    
    socket.current.on('move', (move) => {
      game.move(move);
      setFen(game.fen());
    });

    return () => socket.current.disconnect();
  }, [gameId]);

  const onDrop = ({ sourceSquare, targetSquare }) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });
    
    if (move) {
      setFen(game.fen());
      socket.current.emit('make-move', { gameId, move });
    }
  };

  return (
    <Chessboard
      position={fen}
      onDrop={onDrop}
      boardStyle={{
        borderRadius: '4px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
      }}
    />
  );
};