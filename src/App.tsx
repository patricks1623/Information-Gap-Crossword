import React, { useState, useEffect, useMemo } from 'react';
import { Share2, RefreshCw, Clock, CheckCircle2, Play, Sun, Moon, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { io } from 'socket.io-client';

const socket = io();

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const VOCABULARY = [
  { word: "only child", def: "A person who has no siblings.", q: "What do you think are the advantages and disadvantages of being an ___?" },
  { word: "get on well with", def: "To have a good relationship with someone.", q: "Who is a family member you ___ and why?" },
  { word: "catch up", def: "To talk to someone you haven't seen for a while.", q: "When was the last time you met a friend to ___? What did you talk about?" },
  { word: "come along", def: "To accompany someone or go somewhere with them.", q: "If you were going on a road trip, who would you want to ___?" },
  { word: "outgoing", def: "Friendly and socially confident.", q: "Do you consider yourself an ___ person, or are you more shy?" },
  { word: "laid-back", def: "Relaxed and easygoing.", q: "Who is the most ___ person you know? How do they handle stress?" },
  { word: "strict", def: "Demanding that rules are obeyed.", q: "Were your parents ___ when you were growing up?" },
  { word: "stubborn", def: "Refusing to change your mind or attitude.", q: "Can you share a time when you or someone you know acted very ___?" },
  { word: "close with", def: "Having a strong, intimate relationship.", q: "Which of your relatives are you most ___?" },
  { word: "forgetful", def: "Often forgetting things.", q: "Are you generally organized, or do you tend to be ___?" },
  { word: "gatherings", def: "Social meetings or assemblies.", q: "Do you enjoy large family ___, or do you prefer small groups?" },
  { word: "cheerful", def: "Noticeably happy and optimistic.", q: "What usually makes you feel ___ on a bad day?" },
  { word: "get along well", def: "To have a harmonious relationship.", q: "What is the secret for two people to ___ for a long time?" },
  { word: "revolve around", def: "To have someone or something as the main or most important interest.", q: "Does your weekend usually ___ relaxing, or doing activities?" },
  { word: "invasive", def: "Tending to intrude on a person's privacy.", q: "What kind of personal questions do you consider too ___?" },
  { word: "Bonds", def: "Strong connections or feelings that unite people.", q: "How do people create strong ___ with new friends?" },
  { word: "rubs me the wrong way", def: "To irritate or annoy someone.", q: "What is a common habit that people have that ___?" },
  { word: "easygoing", def: "Relaxed, tolerant, and not easily upset.", q: "Why is it usually nice to travel with someone who is ___?" },
  { word: "fun to be around", def: "Enjoyable to spend time with.", q: "What qualities make a person ___?" },
  { word: "acquaintance", def: "Someone you know slightly, but not a close friend.", q: "How does an ___ eventually become a close friend?" },
  { word: "close friend", def: "A person you know well and trust deeply.", q: "What is the most important quality you look for in a ___?" },
  { word: "childhood friend", def: "A friend you have known since you were young.", q: "Are you still in touch with any ___? Tell me about them." },
  { word: "count on", def: "To rely or depend on someone.", q: "Who is the first person you ___ when you have a serious problem?" },
  { word: "hang out with", def: "To spend time relaxing or socializing with someone.", q: "Where do you usually like to ___ your friends?" },
  { word: "grow apart", def: "To become less close in a relationship over time.", q: "Why do you think some friends ___ as they get older?" },
  { word: "Barely talk", def: "To speak to someone very rarely.", q: "Is there someone you used to be close to, but now you ___? What happened?" },
  { word: "lasts forever", def: "Continues without end.", q: "Do you believe that true friendship ___, or do relationships naturally end?" },
  { word: "Shape", def: "To influence the development or character of something.", q: "How did your early experiences ___ your personality today?" },
  { word: "hit it off", def: "To be naturally friendly and get along immediately.", q: "Have you ever met someone and immediately ___? Tell me about it." },
  { word: "reliable", def: "Consistently good in quality or performance; trustworthy.", q: "Why is it important to have ___ people in your work or study group?" },
  { word: "unpredictable", def: "Not able to be foreseen or known beforehand.", q: "Do you like ___ situations, or do you prefer to plan everything?" },
  { word: "warm and welcoming", def: "Friendly and making someone feel comfortable.", q: "How can a host make their guests feel ___?" },
  { word: "reserved", def: "Slow to reveal emotion or opinions.", q: "Is it difficult to get to know someone who is very ___?" },
  { word: "old fashioned", def: "In or according to styles or types no longer current.", q: "What is an ___ tradition that you still like?" },
  { word: "to get together with", def: "To meet socially.", q: "How often do you try ___ your extended family?" }
];

type WordObj = typeof VOCABULARY[0] & { clean: string };
type PlacedWord = { wordObj: WordObj; row: number; col: number; direction: 'H' | 'V'; number: number };

function getSeededRandom(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function shuffleArray<T>(array: T[], random: () => number): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function generateGrid(words: typeof VOCABULARY, seed: number) {
  const random = getSeededRandom(seed);
  const shuffled = shuffleArray(words, random).slice(0, 10);
  
  const cleanWords = shuffled.map(w => ({
    ...w,
    clean: w.word.replace(/[^a-zA-Z]/g, '').toUpperCase()
  }));

  cleanWords.sort((a, b) => b.clean.length - a.clean.length);

  let bestGrid: any = null;
  let maxPlaced = 0;

  for (let attempt = 0; attempt < 50; attempt++) {
    let currentWords = [...cleanWords];
    if (attempt > 0) {
      currentWords = shuffleArray(currentWords, random);
    }
    
    const grid: Record<string, string> = {};
    const placedWords: PlacedWord[] = [];
    
    const placeWord = (wordObj: WordObj, row: number, col: number, dir: 'H' | 'V') => {
      placedWords.push({ wordObj, row, col, direction: dir, number: placedWords.length + 1 });
      for (let i = 0; i < wordObj.clean.length; i++) {
        const r = dir === 'H' ? row : row + i;
        const c = dir === 'H' ? col + i : col;
        grid[`${r},${c}`] = wordObj.clean[i];
      }
    };

    const canPlace = (word: string, row: number, col: number, dir: 'H' | 'V') => {
      let intersections = 0;
      for (let i = 0; i < word.length; i++) {
        const r = dir === 'H' ? row : row + i;
        const c = dir === 'H' ? col + i : col;
        const cell = grid[`${r},${c}`];
        
        if (cell === word[i]) {
          intersections++;
        } else if (cell !== undefined) {
          return -1;
        } else {
          if (dir === 'H') {
            if (grid[`${r - 1},${c}`] || grid[`${r + 1},${c}`]) return -1;
          } else {
            if (grid[`${r},${c - 1}`] || grid[`${r},${c + 1}`]) return -1;
          }
        }
      }
      if (dir === 'H') {
        if (grid[`${row},${col - 1}`] || grid[`${row},${col + word.length}`]) return -1;
      } else {
        if (grid[`${row - 1},${col}`] || grid[`${row + word.length},${col}`]) return -1;
      }
      return intersections;
    };

    placeWord(currentWords[0], 0, 0, 'H');

    for (let i = 1; i < currentWords.length; i++) {
      const wordObj = currentWords[i];
      const word = wordObj.clean;
      let bestPlacement = null;
      let maxIntersections = -1;

      for (const placed of placedWords) {
        const pWord = placed.wordObj.clean;
        for (let j = 0; j < pWord.length; j++) {
          for (let k = 0; k < word.length; k++) {
            if (pWord[j] === word[k]) {
              const dir = placed.direction === 'H' ? 'V' : 'H';
              const row = placed.direction === 'H' ? placed.row - k : placed.row + j;
              const col = placed.direction === 'H' ? placed.col + j : placed.col - k;
              
              const intersections = canPlace(word, row, col, dir);
              if (intersections > maxIntersections) {
                maxIntersections = intersections;
                bestPlacement = { row, col, dir };
              }
            }
          }
        }
      }

      if (bestPlacement) {
        placeWord(wordObj, bestPlacement.row, bestPlacement.col, bestPlacement.dir);
      } else {
        let minRow = 0;
        for (const key in grid) {
          const r = parseInt(key.split(',')[0]);
          if (r > minRow) minRow = r;
        }
        placeWord(wordObj, minRow + 2, 0, 'H');
      }
    }

    if (placedWords.length > maxPlaced) {
      maxPlaced = placedWords.length;
      bestGrid = { grid, placedWords };
      if (maxPlaced === 10) break;
    }
  }

  let minRow = Infinity, minCol = Infinity, maxRow = -Infinity, maxCol = -Infinity;
  for (const key in bestGrid.grid) {
    const [r, c] = key.split(',').map(Number);
    if (r < minRow) minRow = r;
    if (c < minCol) minCol = c;
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
  }

  const normalizedPlacedWords = bestGrid.placedWords.map((p: any) => ({
    ...p,
    row: p.row - minRow,
    col: p.col - minCol
  }));

  normalizedPlacedWords.sort((a: any, b: any) => {
    if (a.row === b.row) return a.col - b.col;
    return a.row - b.row;
  });

  normalizedPlacedWords.forEach((p: any, idx: number) => {
    p.number = idx + 1;
  });

  return {
    placedWords: normalizedPlacedWords as PlacedWord[],
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1
  };
}

const isWordFilledForRole = (wordNumber: number, role: 'A' | 'B') => {
  if (role === 'A') return wordNumber % 2 !== 0; // 1, 3, 5, 7, 9
  return wordNumber % 2 === 0; // 2, 4, 6, 8, 10
};

export default function App() {
  const [room, setRoom] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    return r ? parseInt(r, 10) : Math.floor(Math.random() * 10000);
  });

  const [role, setRole] = useState<'A' | 'B' | null>(null);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [partnerInputs, setPartnerInputs] = useState<Record<string, string>>({});
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', room.toString());
    window.history.replaceState({}, '', url.toString());

    const joinRoom = () => {
      socket.emit('join-room', room.toString());
    };

    joinRoom();
    socket.on('connect', joinRoom);

    return () => {
      socket.off('connect', joinRoom);
    };
  }, [room]);

  useEffect(() => {
    const handleRedirect = (newRoom: number) => {
      if (room === newRoom) return;
      setRoom(newRoom);
      setTime(0);
      setUserInputs({});
      setPartnerInputs({});
      setVictoryDismissed(false);
      if (isTimerEnabled) setIsRunning(true);
    };

    const handleSync = (inputs: Record<string, string>) => {
      setPartnerInputs(inputs);
    };

    const handleRequestSync = () => {
      if (role) {
        socket.emit('update-inputs', { room: room.toString(), inputs: userInputs });
      }
    };

    socket.on('redirect-room', handleRedirect);
    socket.on('sync-inputs', handleSync);
    socket.on('request-sync', handleRequestSync);

    return () => {
      socket.off('redirect-room', handleRedirect);
      socket.off('sync-inputs', handleSync);
      socket.off('request-sync', handleRequestSync);
    };
  }, [room, role, isTimerEnabled, userInputs]);

  useEffect(() => {
    if (role) {
      socket.emit('update-inputs', { room: room.toString(), inputs: userInputs });
    }
  }, [userInputs, room, role]);

  useEffect(() => {
    if (role) {
      socket.emit('request-sync', room.toString());
    }
  }, [role, room]);

  useEffect(() => {
    let interval: any;
    if (isRunning && isTimerEnabled) {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isTimerEnabled]);

  const board = useMemo(() => {
    setUserInputs({});
    setPartnerInputs({});
    return generateGrid(VOCABULARY, room);
  }, [room]);

  const isCellFilledForRoleFn = (r: number, c: number, roleToCheck: 'A' | 'B') => {
    return board.placedWords.some((pw: PlacedWord) => {
      if (!isWordFilledForRole(pw.number, roleToCheck)) return false;
      if (pw.direction === 'H') {
        return r === pw.row && c >= pw.col && c < pw.col + pw.wordObj.clean.length;
      } else {
        return c === pw.col && r >= pw.row && r < pw.row + pw.wordObj.clean.length;
      }
    });
  };

  const checkWordSolved = (pw: PlacedWord, inputs: Record<string, string>, roleToCheck: 'A' | 'B') => {
    for (let i = 0; i < pw.wordObj.clean.length; i++) {
      const r = pw.direction === 'H' ? pw.row : pw.row + i;
      const c = pw.direction === 'H' ? pw.col + i : pw.col;
      
      if (isCellFilledForRoleFn(r, c, roleToCheck)) {
        continue;
      }
      
      if (inputs[`${r},${c}`]?.toUpperCase() !== pw.wordObj.clean[i]) {
        return false;
      }
    }
    return true;
  };

  const mySolvedWords = useMemo(() => {
    if (!role) return new Set<number>();
    const solved = new Set<number>();
    board.placedWords.forEach((pw: PlacedWord) => {
      if (!isWordFilledForRole(pw.number, role)) {
        if (checkWordSolved(pw, userInputs, role)) {
          solved.add(pw.number);
        }
      }
    });
    return solved;
  }, [board, userInputs, role]);

  const partnerSolvedWords = useMemo(() => {
    if (!role) return new Set<number>();
    const pRole = role === 'A' ? 'B' : 'A';
    const solved = new Set<number>();
    board.placedWords.forEach((pw: PlacedWord) => {
      if (!isWordFilledForRole(pw.number, pRole)) {
        if (checkWordSolved(pw, partnerInputs, pRole)) {
          solved.add(pw.number);
        }
      }
    });
    return solved;
  }, [board, partnerInputs, role]);

  const myMissingWords = role ? board.placedWords.filter((pw: PlacedWord) => !isWordFilledForRole(pw.number, role)) : [];
  const partnerMissingWords = role ? board.placedWords.filter((pw: PlacedWord) => isWordFilledForRole(pw.number, role)) : [];

  const mySolved = myMissingWords.length > 0 && mySolvedWords.size === myMissingWords.length;
  const partnerSolved = partnerMissingWords.length > 0 && partnerSolvedWords.size === partnerMissingWords.length;

  const isVictory = role && mySolved && partnerSolved;

  useEffect(() => {
    if (isVictory && isRunning) {
      setIsRunning(false);
    }
  }, [isVictory, isRunning]);

  const handleNewRound = () => {
    if (window.confirm('Start a new round? This will change the room code and reset the game for both players.')) {
      const newRoom = ((room + 12345) * 16807) % 2147483647 % 100000;
      socket.emit('new-round', { room: room.toString(), newRoom });
      setRoom(newRoom);
      setTime(0);
      setUserInputs({});
      setPartnerInputs({});
      setVictoryDismissed(false);
      if (isTimerEnabled) setIsRunning(true);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied! Send it to your partner.');
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans transition-colors">
        <div className="absolute top-4 right-4">
          <button onClick={toggleTheme} className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Share2 size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Information Gap Crossword</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            Work with your partner to complete the puzzle. You will each see half of the answers and clues.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <input 
                type="checkbox" 
                id="timer-toggle" 
                checked={isTimerEnabled}
                onChange={(e) => setIsTimerEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 dark:text-indigo-500 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-slate-800"
              />
              <label htmlFor="timer-toggle" className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Enable Timer
              </label>
            </div>
            <button 
              onClick={() => { setRole('A'); if(isTimerEnabled) setIsRunning(true); }} 
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              I am Student A
            </button>
            <button 
              onClick={() => { setRole('B'); if(isTimerEnabled) setIsRunning(true); }} 
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              I am Student B
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 font-medium">Playing with a partner online?</p>
            <button 
              onClick={copyLink} 
              className="flex items-center justify-center w-full gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
            >
              <Share2 size={18} />
              Copy Invite Link
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Room Code: {room}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors">
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <h1 className="font-bold text-lg sm:text-xl text-slate-800 dark:text-slate-100 hidden sm:block">ESL Crossword</h1>
            <div className={cn(
              "px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2",
              role === 'A' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
            )}>
              Student {role}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {isTimerEnabled && (
              <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium">
                <Clock size={14} className="text-slate-400 dark:text-slate-500 sm:w-4 sm:h-4" />
                {Math.floor(time / 60).toString().padStart(2, '0')}:{(time % 60).toString().padStart(2, '0')}
              </div>
            )}
            <button onClick={toggleTheme} className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={handleNewRound} 
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-2 sm:px-3 py-1.5 rounded-lg shadow-sm"
            >
              <RefreshCw size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">New Round</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col lg:flex-row gap-4 sm:gap-8 lg:overflow-hidden relative">
        {isVictory && !victoryDismissed && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-2xl m-2 sm:m-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-900/50 text-center max-w-sm mx-4 transform animate-in zoom-in duration-300 relative">
              <button 
                onClick={() => setVictoryDismissed(true)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Puzzle Solved!</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Great teamwork! You and your partner have successfully completed the crossword.
                {isTimerEnabled && <span className="block mt-2 font-medium text-slate-800 dark:text-slate-200">Time: {Math.floor(time / 60).toString().padStart(2, '0')}:{(time % 60).toString().padStart(2, '0')}</span>}
              </p>
              <button
                onClick={() => setVictoryDismissed(true)}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors shadow-sm"
              >
                Review Board
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 sm:p-6 overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Crossword Grid</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Fill in the missing words by asking your partner.</p>
          </div>
          <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner relative transition-colors">
            <div className="min-w-full min-h-full w-max h-max flex items-center justify-center p-4 sm:p-8">
              <CrosswordGrid 
                board={board} 
                role={role} 
                userInputs={userInputs} 
                setUserInputs={setUserInputs} 
                partnerInputs={partnerInputs}
                partnerSolvedWords={partnerSolvedWords}
              />
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-[400px] flex flex-col gap-4 sm:gap-6 lg:h-full lg:min-h-0">
          <CluesPanel board={board} role={role} partnerSolvedWords={partnerSolvedWords} />
        </div>
      </main>
    </div>
  );
}

function CrosswordGrid({ board, role, userInputs, setUserInputs, partnerInputs, partnerSolvedWords }: { 
  board: any, 
  role: 'A' | 'B',
  userInputs: Record<string, string>,
  setUserInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  partnerInputs: Record<string, string>,
  partnerSolvedWords: Set<number>
}) {
  type CellData = { isActive: boolean; letter: string; number?: number; isFilledForRole: boolean; words: PlacedWord[] };
  
  const gridCells: CellData[][] = Array.from({ length: board.rows }, () => 
    Array.from({ length: board.cols }, () => ({
      isActive: false, letter: '', isFilledForRole: false, words: []
    }))
  );

  board.placedWords.forEach((pw: PlacedWord) => {
    for (let i = 0; i < pw.wordObj.clean.length; i++) {
      const r = pw.direction === 'H' ? pw.row : pw.row + i;
      const c = pw.direction === 'H' ? pw.col + i : pw.col;
      
      const cell = gridCells[r][c];
      cell.isActive = true;
      cell.letter = pw.wordObj.clean[i];
      cell.words.push(pw);
      if (i === 0) {
        if (!cell.number) cell.number = pw.number;
        else cell.number = Math.min(cell.number, pw.number);
      }
    }
  });

  // Determine if a cell is filled based on whether ANY of its intersecting words are filled for this role
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (gridCells[r][c].isActive) {
        gridCells[r][c].isFilledForRole = gridCells[r][c].words.some(pw => isWordFilledForRole(pw.number, role));
      }
    }
  }

  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const [typingDirection, setTypingDirection] = React.useState<'H' | 'V'>('H');

  const handleFocus = (r: number, c: number) => {
    const cell = gridCells[r][c];
    const guessingWords = cell.words.filter(pw => !isWordFilledForRole(pw.number, role));
    if (guessingWords.length === 1) {
      setTypingDirection(guessingWords[0].direction);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const cell = gridCells[r][c];
    const guessingWords = cell.words.filter(pw => !isWordFilledForRole(pw.number, role));
    let currentDir = typingDirection;
    if (guessingWords.length === 1) {
      currentDir = guessingWords[0].direction;
    }

    if (e.key === 'Backspace') {
      if (!userInputs[`${r},${c}`]) {
        e.preventDefault();
        let prevR = currentDir === 'V' ? r - 1 : r;
        let prevC = currentDir === 'H' ? c - 1 : c;
        
        while (
          gridCells[prevR] && 
          gridCells[prevR][prevC] && 
          gridCells[prevR][prevC].isActive &&
          gridCells[prevR][prevC].isFilledForRole
        ) {
          prevR = currentDir === 'V' ? prevR - 1 : prevR;
          prevC = currentDir === 'H' ? prevC - 1 : prevC;
        }

        const prevKey = `${prevR},${prevC}`;
        if (inputRefs.current[prevKey]) {
          inputRefs.current[prevKey]?.focus();
        }
      }
    } else if (e.key === 'ArrowRight') {
      const nextKey = `${r},${c + 1}`;
      if (inputRefs.current[nextKey]) { setTypingDirection('H'); inputRefs.current[nextKey]?.focus(); }
    } else if (e.key === 'ArrowLeft') {
      const prevKey = `${r},${c - 1}`;
      if (inputRefs.current[prevKey]) { setTypingDirection('H'); inputRefs.current[prevKey]?.focus(); }
    } else if (e.key === 'ArrowDown') {
      const nextKey = `${r + 1},${c}`;
      if (inputRefs.current[nextKey]) { setTypingDirection('V'); inputRefs.current[nextKey]?.focus(); }
    } else if (e.key === 'ArrowUp') {
      const prevKey = `${r - 1},${c}`;
      if (inputRefs.current[prevKey]) { setTypingDirection('V'); inputRefs.current[prevKey]?.focus(); }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, r: number, c: number) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const lastChar = val.slice(-1);
    
    setUserInputs(prev => ({ ...prev, [`${r},${c}`]: lastChar }));

    if (lastChar) {
      const cell = gridCells[r][c];
      const guessingWords = cell.words.filter(pw => !isWordFilledForRole(pw.number, role));
      let currentDir = typingDirection;
      if (guessingWords.length === 1) {
        currentDir = guessingWords[0].direction;
      }

      let nextR = currentDir === 'V' ? r + 1 : r;
      let nextC = currentDir === 'H' ? c + 1 : c;
      
      while (
        gridCells[nextR] && 
        gridCells[nextR][nextC] && 
        gridCells[nextR][nextC].isActive &&
        gridCells[nextR][nextC].isFilledForRole
      ) {
        nextR = currentDir === 'V' ? nextR + 1 : nextR;
        nextC = currentDir === 'H' ? nextC + 1 : nextC;
      }

      const nextKey = `${nextR},${nextC}`;
      
      if (inputRefs.current[nextKey]) {
        inputRefs.current[nextKey]?.focus();
      }
    }
  };

  return (
    <div 
      className="grid gap-0.5 sm:gap-1 mx-auto" 
      style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(20px, 36px))` }}
    >
      {gridCells.map((row, r) => row.map((cell, c) => {
        if (!cell.isActive) return <div key={`${r}-${c}`} className="w-full aspect-square" />;
        
        const inputKey = `${r},${c}`;
        const isCorrect = userInputs[inputKey]?.toUpperCase() === cell.letter;
        const displayValue = cell.isFilledForRole ? cell.letter : (userInputs[inputKey] || '');
        
        let isSolvedByPartner = false;
        if (cell.isFilledForRole) {
          isSolvedByPartner = cell.words
            .filter(pw => isWordFilledForRole(pw.number, role))
            .some(pw => partnerSolvedWords.has(pw.number));
        }
        
        const partnerTyped = partnerInputs[inputKey];
        const showPartnerTyping = cell.isFilledForRole && partnerTyped && partnerTyped.toUpperCase() !== cell.letter && !isSolvedByPartner;
        
        return (
          <div key={`${r}-${c}`} className="relative w-full aspect-square">
            {cell.number && (
              <span className="absolute top-0 left-0.5 text-[8px] sm:text-[10px] font-bold leading-none z-10 text-slate-700 dark:text-slate-400">
                {cell.number}
              </span>
            )}
            {cell.isFilledForRole ? (
              <div className={cn(
                "w-full h-full flex items-center justify-center font-bold text-xs sm:text-base rounded-sm shadow-sm border transition-colors relative",
                isSolvedByPartner ? "bg-emerald-200 dark:bg-emerald-800 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100" : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200"
              )}>
                {cell.letter}
                {showPartnerTyping && (
                  <span className="absolute bottom-0 right-0.5 text-[8px] sm:text-[10px] font-bold text-red-500 dark:text-red-400 leading-none">
                    {partnerTyped.toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              <input
                ref={el => inputRefs.current[inputKey] = el}
                type="text"
                maxLength={2}
                value={displayValue}
                onFocus={() => handleFocus(r, c)}
                onKeyDown={(e) => handleKeyDown(e, r, c)}
                onChange={(e) => handleChange(e, r, c)}
                className={cn(
                  "w-full h-full text-center font-bold text-xs sm:text-base border rounded-sm outline-none transition-all shadow-sm",
                  "focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:z-20 relative caret-transparent",
                  displayValue && isCorrect ? "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300" : 
                  displayValue && !isCorrect ? "bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-500 text-red-800 dark:text-red-300" : 
                  "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-indigo-700 dark:text-indigo-300"
                )}
              />
            )}
          </div>
        );
      }))}
    </div>
  );
}

function CluesPanel({ board, role, partnerSolvedWords }: { board: any, role: 'A' | 'B', partnerSolvedWords: Set<number> }) {
  const myWords = board.placedWords.filter((pw: PlacedWord) => isWordFilledForRole(pw.number, role));
  const wordsToGuess = board.placedWords.filter((pw: PlacedWord) => !isWordFilledForRole(pw.number, role));

  return (
    <div className="flex flex-col gap-4 sm:gap-6 h-full lg:overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex-1 flex flex-col min-h-[300px] lg:min-h-0 transition-colors">
        <div className="mb-4 flex-none">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
            <span className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm",
              role === 'A' ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
            )}>1</span>
            Read to your partner
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Read the definition and ask the question to help your partner guess the word.</p>
        </div>
        <div className="space-y-4 overflow-y-auto pr-2 pb-2 flex-1 min-h-0">
          {myWords.map((pw: PlacedWord) => {
            const isSolved = partnerSolvedWords.has(pw.number);
            return (
              <div key={pw.number} className={cn(
                "p-4 rounded-xl border shadow-sm transition-colors",
                isSolved ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              )}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    "font-bold px-2 py-1 rounded border text-sm shadow-sm",
                    isSolved ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                  )}>
                    {pw.number} {pw.direction === 'H' ? 'Across' : 'Down'}
                  </span>
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                    isSolved ? "bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}>
                    {pw.wordObj.word}
                  </span>
                  {isSolved && <CheckCircle2 className="ml-auto text-emerald-500 dark:text-emerald-400 w-5 h-5" />}
                </div>
                <div className="space-y-3 text-sm">
                  <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200 block mb-0.5 text-xs uppercase tracking-wider">Definition</strong> 
                    {pw.wordObj.def}
                  </p>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    isSolved ? "bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50" : "bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50"
                  )}>
                    <strong className={cn(
                      "block mb-0.5 text-xs uppercase tracking-wider flex items-center gap-1",
                      isSolved ? "text-emerald-700 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                    )}>
                      Question to ask
                    </strong> 
                    <span className="text-slate-700 dark:text-slate-300 font-medium italic">"{pw.wordObj.q}"</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex-none transition-colors">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
          <span className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm",
            role === 'A' ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
          )}>2</span>
          Ask your partner
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3 sm:mb-4">Ask: <strong className="text-slate-700 dark:text-slate-200">"What is [Number] [Across/Down]?"</strong></p>
        <div className="grid grid-cols-2 gap-2">
          {wordsToGuess.map((pw: PlacedWord) => (
            <div key={pw.number} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] sm:text-xs shadow-sm">
                {pw.number}
              </span>
              {pw.direction === 'H' ? 'Across' : 'Down'}
              <span className="ml-auto text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-normal">({pw.wordObj.clean.length})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
