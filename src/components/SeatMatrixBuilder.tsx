import React, { useState, useEffect } from 'react';
import { Screen, SeatConfig, SeatType, ScreenLayout } from '../types';
import { 
  Grid, Armchair, Users, Accessibility, Ban, Save, Sparkles, RefreshCw, 
  Layers, Plus, Trash2, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SeatMatrixBuilderProps {
  screen: Screen;
  onSave: (updatedScreen: Screen) => void;
  onCancel?: () => void;
}

export const SeatMatrixBuilder: React.FC<SeatMatrixBuilderProps> = ({
  screen,
  onSave,
  onCancel
}) => {
  const { formatCurrency } = useLanguage();
  const [screenName, setScreenName] = useState(screen.screenName);
  const [rows, setRows] = useState(screen.layout.rows || 6);
  const [cols, setCols] = useState(screen.layout.cols || 10);
  const [stageName, setStageName] = useState(screen.layout.stageName || 'MAIN SCREEN (DOLBY ATMOS)');
  const [screenPosition, setScreenPosition] = useState<'top' | 'bottom'>(screen.layout.screenPosition || 'top');
  
  // Brush tool state: what gets applied when a seat is clicked
  const [activeTool, setActiveTool] = useState<SeatType>('standard');
  const [seats, setSeats] = useState<SeatConfig[]>(() => {
    return screen.layout.seats && screen.layout.seats.length > 0 
      ? [...screen.layout.seats] 
      : [];
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Alphabet list for row identifiers
  const rowAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Re-generate grid if rows or cols change
  const rebuildGrid = (newRows: number, newCols: number) => {
    const newSeats: SeatConfig[] = [];
    for (let r = 0; r < newRows; r++) {
      const rowChar = rowAlphabet[r];
      for (let c = 1; c <= newCols; c++) {
        const existing = seats.find((s) => s.row === rowChar && s.col === c);
        if (existing) {
          newSeats.push(existing);
        } else {
          // Aisle default in center
          const isAisle = newCols >= 10 && c === Math.floor(newCols / 2);
          newSeats.push({
            id: `${rowChar}-${c}`,
            row: rowChar,
            col: c,
            type: isAisle ? 'aisle' : 'standard',
            active: !isAisle
          });
        }
      }
    }
    setSeats(newSeats);
  };

  const handleRowsChange = (newRows: number) => {
    const clamped = Math.max(1, Math.min(20, newRows));
    setRows(clamped);
    rebuildGrid(clamped, cols);
  };

  const handleColsChange = (newCols: number) => {
    const clamped = Math.max(1, Math.min(30, newCols));
    setCols(clamped);
    rebuildGrid(rows, clamped);
  };

  // Click on a seat in builder to apply active tool
  const handleCellClick = (rowChar: string, colNum: number) => {
    setSeats((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((s) => s.row === rowChar && s.col === colNum);
      const isSpaceOrAisle = activeTool === 'aisle' || activeTool === 'space';

      if (idx >= 0) {
        copy[idx] = {
          ...copy[idx],
          type: activeTool,
          active: !isSpaceOrAisle
        };
      } else {
        copy.push({
          id: `${rowChar}-${colNum}`,
          row: rowChar,
          col: colNum,
          type: activeTool,
          active: !isSpaceOrAisle
        });
      }
      return copy;
    });
  };

  // Bulk row applicator
  const applyToolToEntireRow = (rowChar: string) => {
    setSeats((prev) => {
      return prev.map((s) => {
        if (s.row === rowChar) {
          const isSpace = activeTool === 'aisle' || activeTool === 'space';
          return { ...s, type: activeTool, active: !isSpace };
        }
        return s;
      });
    });
  };

  const handleSave = () => {
    const rowLabels = rowAlphabet.slice(0, rows);
    const updatedLayout: ScreenLayout = {
      rows,
      cols,
      rowLabels,
      seats,
      screenPosition,
      stageName
    };

    const updatedScreen: Screen = {
      ...screen,
      screenName,
      layout: updatedLayout
    };

    onSave(updatedScreen);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Calculate statistics
  const totalStandard = seats.filter((s) => s.type === 'standard' && s.active).length;
  const totalVip = seats.filter((s) => s.type === 'vip' && s.active).length;
  const totalCouple = seats.filter((s) => s.type === 'couple' && s.active).length;
  const totalAccessible = seats.filter((s) => s.type === 'accessible' && s.active).length;
  const totalAudienceCapacity = totalStandard + totalVip + totalCouple + totalAccessible;

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-2xl">
      {/* Top Header & Screen Metadata */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Grid className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-white">Visual Seat Matrix Builder</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
              Multi-Screen Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure custom seating arrangements, aisle corridors, VIP zones, and wheelchair spaces for this screen.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition active:scale-95"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Layout Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Screen Layout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Screen Configurations Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Screen / Auditorium Name
          </label>
          <input
            type="text"
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
            placeholder="e.g. Screen A (Laser Deluxe)"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Stage / Screen Direction Text
          </label>
          <input
            type="text"
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
            placeholder="e.g. MAIN AUDITORIUM STAGE"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Grid Rows (A–{rowAlphabet[rows - 1]})
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => handleRowsChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 font-mono">1-20</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Grid Columns (1–{cols})
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              max={30}
              value={cols}
              onChange={(e) => handleColsChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 font-mono">1-30</span>
          </div>
        </div>
      </div>

      {/* Paint Brush Tool Selector */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Active Brush Tool (Click seats below to apply)</span>
          </span>
          <span className="text-xs text-slate-400">
            Total Hall Capacity: <strong className="text-teal-300 font-mono">{totalAudienceCapacity} Seats</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTool('standard')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
              activeTool === 'standard'
                ? 'bg-slate-700 text-white border-teal-400 ring-2 ring-teal-500/20'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Armchair className="w-4 h-4 text-slate-300" />
            <span>Standard Seat ({totalStandard})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('vip')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
              activeTool === 'vip'
                ? 'bg-amber-950/60 text-amber-300 border-amber-400 ring-2 ring-amber-500/30'
                : 'bg-slate-800/80 text-amber-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>VIP / Premium ({totalVip})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('couple')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
              activeTool === 'couple'
                ? 'bg-rose-950/60 text-rose-300 border-rose-400 ring-2 ring-rose-500/30'
                : 'bg-slate-800/80 text-rose-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-rose-400" />
            <span>Couple Seat ({totalCouple})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('accessible')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
              activeTool === 'accessible'
                ? 'bg-sky-950/60 text-sky-300 border-sky-400 ring-2 ring-sky-500/30'
                : 'bg-slate-800/80 text-sky-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Accessibility className="w-4 h-4 text-sky-400" />
            <span>Accessible / Wheelchair ({totalAccessible})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('aisle')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
              activeTool === 'aisle'
                ? 'bg-slate-900 text-rose-400 border-rose-500 ring-2 ring-rose-500/30'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Ban className="w-4 h-4 text-rose-400" />
            <span>Aisle / Space (Blank)</span>
          </button>
        </div>
      </div>

      {/* Screen Curve Representation */}
      <div className="mb-6 text-center">
        <div className="cinema-screen-curve mx-auto max-w-xl mb-1.5" />
        <div className="text-[11px] uppercase tracking-widest text-teal-400 font-bold">
          {stageName}
        </div>
      </div>

      {/* Interactive Matrix Workspace */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="min-w-fit mx-auto flex flex-col items-center space-y-2">
          {rowAlphabet.slice(0, rows).map((rowChar) => {
            return (
              <div key={rowChar} className="flex items-center space-x-2 group/row">
                {/* Row Quick Action Button */}
                <button
                  onClick={() => applyToolToEntireRow(rowChar)}
                  title={`Paint entire Row ${rowChar} with ${activeTool}`}
                  className="w-6 h-6 rounded bg-slate-800 hover:bg-teal-600 hover:text-slate-950 text-slate-400 text-[10px] font-bold transition flex items-center justify-center"
                >
                  {rowChar}
                </button>

                {/* Seats */}
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  {Array.from({ length: cols }, (_, i) => i + 1).map((colNum) => {
                    const seat = seats.find((s) => s.row === rowChar && s.col === colNum) || {
                      id: `${rowChar}-${colNum}`,
                      row: rowChar,
                      col: colNum,
                      type: 'standard',
                      active: true
                    };

                    const isAisle = seat.type === 'aisle' || seat.type === 'space';

                    let cellBg = 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700';
                    let label = `${colNum}`;

                    if (seat.type === 'vip') {
                      cellBg = 'bg-amber-950/40 text-amber-300 border-amber-500/50 hover:bg-amber-900/60';
                    } else if (seat.type === 'couple') {
                      cellBg = 'bg-rose-950/40 text-rose-300 border-rose-500/50 hover:bg-rose-900/60';
                    } else if (seat.type === 'accessible') {
                      cellBg = 'bg-sky-950/40 text-sky-300 border-sky-500/50 hover:bg-sky-900/60';
                    } else if (isAisle) {
                      cellBg = 'bg-slate-950/50 text-slate-700 border-dashed border-slate-800 hover:border-slate-600';
                      label = '·';
                    }

                    return (
                      <button
                        key={`${rowChar}-${colNum}`}
                        type="button"
                        onClick={() => handleCellClick(rowChar, colNum)}
                        title={`Seat ${rowChar}-${colNum} (${seat.type}) - Click to set as ${activeTool}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-[10px] font-mono font-medium border flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${cellBg}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <span className="w-6 text-center text-[10px] font-bold text-slate-500">
                  {rowChar}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
