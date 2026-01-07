import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px] animate-pulse delay-700" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <h1 className="text-2xl font-medium text-white/80 tracking-wide">Updating...</h1>
      </motion.div>
    </div>
  );
}
