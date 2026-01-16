import React from 'react';
import { Scissors } from 'lucide-react';
import Button from './Button';

interface WelcomeScreenProps {
  onEnter: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800 rounded-full blur-[128px]"></div>
      </div>

      <div className="z-10 flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-24 h-24 rounded-full border-2 border-amber-500 flex items-center justify-center mb-4 bg-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <Scissors className="text-amber-500 w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl md:text-8xl font-heading font-bold text-white tracking-tighter">
            LA BARBERÍA
          </h1>
          <p className="text-xl text-amber-500 font-heading tracking-[0.5em] uppercase">
            Sistema POS Profesional
          </p>
        </div>

        <div className="mt-12 w-64">
          <Button
            onClick={onEnter}
            fullWidth
            className="text-lg py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest border-0"
          >
            Ingresar al Sistema
          </Button>
        </div>

        <p className="mt-8 text-zinc-600 text-xs uppercase tracking-widest">
          Sistema de Gestión Premium v1.0
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;