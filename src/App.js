import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { INITIAL_ENERGY,REPRODUCTION_ENERGY,REPRODUCTION_COST,FOOD_ENERGY,MOVEMENT_COST,REPRODUCTION_CHANCE,MAX_FOOD,POPULATION_LIMIT,GRID_SIZE } from "./constants";




function App() {
  const canvasRef = useRef(null);
  const [initialConfig, setInitialConfig] = useState({
    purplePopulation: 2,
    orangePopulation: 2,
    foodCount: 10,
    foodGenerationRate: 2
  });
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [bichinhos, setBichinhos] = useState([]);
  const [comida, setComida] = useState([]);
  const [gridSize, setGridSize] = useState(50);
  const [nextId, setNextId] = useState(1);
  const [eventLog, setEventLog] = useState([]);
  const [timer, setTimer] = useState(0);
  const [finalScore, setFinalScore] = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval;
    if (started && !gameOver) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [started, gameOver]);

  const addEvent = (message) => {
    setEventLog(prev => [...prev, { message, timestamp: new Date().toLocaleTimeString() }].slice(-5));
  };

  const randomPosition = () => ({
    x: Math.floor(Math.random() * gridSize),
    y: Math.floor(Math.random() * gridSize)
  });

  const resetGame = () => {
    setStarted(false);
    setGameOver(false);
    setBichinhos([]);
    setComida([]);
    setNextId(1);
    setEventLog([]);
    setTimer(0);
    setFinalScore(null);
  };

  const handleGameOver = () => {
    setGameOver(true);
    setFinalScore(timer);
  };

  const gerarComida = () => {
    if (comida.length < MAX_FOOD) {
      setComida(prev => [...prev, randomPosition()]);
    }
  };

  const iniciarSimulacao = () => {
    const purpleBichinhos = Array.from({ length: initialConfig.purplePopulation }, (_, index) => ({
      ...randomPosition(),
      energia: INITIAL_ENERGY,
      id: index + 1,
      species: 'purple'
    }));

    const orangeBichinhos = Array.from({ length: initialConfig.orangePopulation }, (_, index) => ({
      ...randomPosition(),
      energia: INITIAL_ENERGY,
      id: initialConfig.purplePopulation + index + 1,
      species: 'orange'
    }));

    setBichinhos([...purpleBichinhos, ...orangeBichinhos]);
    setNextId(initialConfig.purplePopulation + initialConfig.orangePopulation + 1);

    const novaComida = Array.from(
      { length: initialConfig.foodCount },
      () => randomPosition()
    );
    setComida(novaComida);
    setStarted(true);
    setGameOver(false);
    setEventLog([]);
    setTimer(0);
    setFinalScore(null);
    addEvent("Simulação iniciada!");
  };

  useEffect(() => {
    if (!started || gameOver) return;

    const interval = setInterval(() => {
      if (Math.random() < initialConfig.foodGenerationRate / 10) {
        gerarComida();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [started, gameOver, initialConfig.foodGenerationRate]);

  const distance = (pos1, pos2) => {
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    return Math.sqrt(dx * dx + dy * dy);
  };

  const checkCollisions = (bichinho, novosBichinhos) => {
    return novosBichinhos.some(
      other => 
        other.id !== bichinho.id && 
        other.species !== bichinho.species &&
        distance(bichinho, other) <= 1.5
    );
  };

  const reproduzir = (bichinho) => {
    if (bichinho.energia >= REPRODUCTION_ENERGY && Math.random() < REPRODUCTION_CHANCE) {
      const offset = Math.random() < 0.5 ? 1 : -1;
      const direction = Math.random() < 0.5 ? 'x' : 'y';
      const novoBichinho = {
        ...bichinho,
        [direction]: (bichinho[direction] + offset + gridSize) % gridSize,
        energia: INITIAL_ENERGY,
        id: nextId
      };
      setNextId(prev => prev + 1);
      return [
        { ...bichinho, energia: bichinho.energia - REPRODUCTION_COST },
        novoBichinho
      ];
    }
    return [bichinho];
  };

  const moveInGrid = (coord, delta, size) => {
    return (coord + delta + size) % size;
  };

  const checkPopulationCollapse = (population) => {
    if (population >= POPULATION_LIMIT) {
      addEvent("COLAPSO POPULACIONAL! A população excedeu o limite sustentável!");
      handleGameOver();
      return true;
    }
    return false;
  };

  const atualizarBichinhos = () => {
    setBichinhos((prevBichinhos) => {
      if (checkPopulationCollapse(prevBichinhos.length)) {
        return [];
      }

      const novosBichinhos = prevBichinhos
        .flatMap((bichinho) => {
          const moveX = Math.random() < 0.5;
          const delta = Math.random() < 0.5 ? -1 : 1;
          
          const novaPos = {
            x: moveX ? moveInGrid(bichinho.x, delta, gridSize) : bichinho.x,
            y: !moveX ? moveInGrid(bichinho.y, delta, gridSize) : bichinho.y
          };
          
          const energia = bichinho.energia - MOVEMENT_COST;
          
          const comeuIndex = comida.findIndex(
            food => distance(novaPos, food) <= 1.5
          );
          
          const comeu = comeuIndex !== -1;
          
          if (comeu) {
            setComida((prevComida) => {
              const novaComida = [...prevComida];
              novaComida.splice(comeuIndex, 1);
              return novaComida;
            });
          }

          const bichinhoAtualizado = {
            ...bichinho,
            ...novaPos,
            energia: energia + (comeu ? FOOD_ENERGY : 0),
          };

          if (checkCollisions(bichinhoAtualizado, prevBichinhos)) {
            return [];
          }

          return bichinhoAtualizado.energia > 0 ? reproduzir(bichinhoAtualizado) : [];
        });

      if (novosBichinhos.length === 0 && !gameOver) {
        addEvent("EXTINÇÃO! Todos os bichinhos morreram!");
        handleGameOver();
      }

      if (novosBichinhos.length >= prevBichinhos.length * 2) {
        addEvent("A população dobrou de tamanho!");
      } else if (novosBichinhos.length <= prevBichinhos.length / 2 && novosBichinhos.length > 0) {
        addEvent("A população foi reduzida pela metade!");
      }

      return novosBichinhos;
    });
  };

  useEffect(() => {
    if (!started || gameOver) return;

    const interval = setInterval(() => {
      atualizarBichinhos();
    }, 100);
    return () => clearInterval(interval);
  }, [started, gameOver]);

  useEffect(() => {
    if (!started) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const cellSize = canvas.width / gridSize;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = "48px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
      return;
    }

    comida.forEach(({ x, y }) => {
      ctx.fillStyle = "green";
      const pixelX = x * cellSize;
      const pixelY = y * cellSize;
      ctx.fillRect(pixelX, pixelY, cellSize * 0.8, cellSize * 0.8);
    });

    bichinhos.forEach((bichinho) => {
      const pixelX = bichinho.x * cellSize;
      const pixelY = bichinho.y * cellSize;
      
      const energyHeight = (bichinho.energia / (REPRODUCTION_ENERGY + 50)) * cellSize;
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(pixelX, pixelY - energyHeight, cellSize * 0.3, energyHeight);

      ctx.beginPath();
      ctx.arc(pixelX + cellSize/2, pixelY + cellSize/2, cellSize * 0.4, 0, Math.PI * 2);
      
      const energyRatio = bichinho.energia / REPRODUCTION_ENERGY;
      const baseColor = bichinho.species === 'purple' ? '#800080' : '#FFA500';
      const color = energyRatio >= 1 ? '#00ff00' : 
                    energyRatio >= 0.5 ? baseColor : 
                    '#ff0000';
      
      ctx.fillStyle = color;
      ctx.fill();
    });
  }, [bichinhos, comida, started, gameOver]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInitialConfig(prev => ({
      ...prev,
      [name]: Math.max(0, parseInt(value) || 0)
    }));
  };

  const addBichinho = (species) => {
    if (gameOver) return;
    
    setBichinhos(prev => {
      if (prev.length >= POPULATION_LIMIT - 1) {
        addEvent("AVISO: Próximo do limite populacional!");
        return prev;
      }
      return [
        ...prev,
        {
          ...randomPosition(),
          energia: INITIAL_ENERGY,
          id: nextId,
          species
        }
      ];
    });
    setNextId(prev => prev + 1);
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-5xl my-4">Simulação de Bichinhos</h1>
      
      {!started ? (
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex gap-4 items-center">
            <label className="flex flex-col">
              População Roxa Inicial:
              <input
                type="number"
                name="purplePopulation"
                value={initialConfig.purplePopulation}
                onChange={handleInputChange}
                min="1"
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col">
              População Laranja Inicial:
              <input
                type="number"
                name="orangePopulation"
                value={initialConfig.orangePopulation}
                onChange={handleInputChange}
                min="1"
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col">
              Quantidade de Comida:
              <input
                type="number"
                name="foodCount"
                value={initialConfig.foodCount}
                onChange={handleInputChange}
                min="0"
                className="border rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col">
              Taxa de Geração de Comida (por segundo):
              <input
                type="number"
                name="foodGenerationRate"
                value={initialConfig.foodGenerationRate}
                onChange={handleInputChange}
                min="0"
                max="10"
                className="border rounded px-2 py-1"
              />
            </label>
          </div>
          <button
            onClick={iniciarSimulacao}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Iniciar Simulação
          </button>
        </div>
      ) : (
        <>
          <div className="text-lg mb-4">
            <div className="flex gap-4 items-center justify-center">
              <div>
                Bichinhos Roxos: {bichinhos.filter(b => b.species === 'purple').length} |
                Bichinhos Laranjas: {bichinhos.filter(b => b.species === 'orange').length} |
                Comida: {comida.length}
              </div>
              <div className="font-bold text-xl ml-4">
                Tempo: {formatTime(timer)}
              </div>
            </div>
          </div>

        

          <div className="bg-gray-100 p-4 rounded-lg mb-4 w-[600px]">
            <h3 className="font-bold mb-2">Eventos:</h3>
            {eventLog.map((event, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-500">[{event.timestamp}]</span> {event.message}
              </div>
            ))}
          </div>

          <canvas 
            className="border-2 my-4 rounded-md bg-gray-50" 
            ref={canvasRef} 
            width={600} 
            height={600}
          />

          {gameOver && (
            <div className="text-xl font-bold mb-4 text-center">
              Pontuação Final: {formatTime(finalScore)}
            </div>
          )}

          <div className="flex gap-2">
            {gameOver ? (
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Reiniciar Simulação
              </button>
            ) : (
              <>
                <button
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                  onClick={() => addBichinho('purple')}
                >
                  Adicionar Roxo
                </button>
                <button
                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                  onClick={() => addBichinho('orange')}
                >
                  Adicionar Laranja
                </button>
                <button
                  className="px-4 py-2 border-green-300 bg-green-500 text-white rounded-md hover:bg-green-600"
                  onClick={() => setComida(prev => [...prev, randomPosition()])}
                >
                  Adicionar Comida
                </button>
              </>
            )}
          </div>
        </>
      )}
        <div className="bg-gray-100 p-4 rounded-lg mb-4 w-[600px]">
            <h3 className="font-bold mb-2">Legenda:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Cores dos Bichinhos:</h4>
                <ul className="text-sm">
                  <li>🟣 Roxo/🟡 Laranja: Energia normal</li>
                  <li>🔴 Vermelho: Energia baixa</li>
                  <li>🟢 Verde: Pronto para reproduzir</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Indicadores:</h4>
                <ul className="text-sm">
                  <li>Barra vermelha: Nível de energia</li>
                  <li>■ Verde: Comida</li>
                </ul>
              </div>
            </div>
          </div>
    </div>
  );
}

export default App;
