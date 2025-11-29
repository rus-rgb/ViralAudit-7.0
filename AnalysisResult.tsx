import React from 'react';
import { motion } from 'framer-motion';
import { AnalysisData } from './types';

// --- UI Helpers ---
const ScoreCircle = ({ score }: { score: number }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 10) * circumference;
    
    let color = '#ef4444'; // Red
    if (score >= 5) color = '#eab308'; // Yellow
    if (score >= 8) color = '#22c55e'; // Green

    return (
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r={radius} stroke="#333" strokeWidth="6" fill="transparent" />
                <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <span className="absolute text-2xl font-bold text-white">{score}/10</span>
        </div>
    );
};

const StatusChip = ({ status }: { status: 'PASS' | 'FAIL' | 'WARN' }) => {
    const styles = {
        PASS: 'bg-green-500/10 text-green-500 border-green-500/20',
        FAIL: 'bg-red-500/10 text-red-400 border-red-500/20',
        WARN: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status]}`}>{status}</span>;
};

const AnalysisResult: React.FC<{ data: AnalysisData }> = ({ data }) => {
    return (
        <div className="space-y-6 pb-10">
            {/* Verdict Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-6 items-center bg-[#161616] p-6 rounded-2xl border border-white/10">
                <div className="flex-shrink-0"><ScoreCircle score={data.overallScore} /></div>
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Creative Director's Verdict</h3>
                    <p className="text-lg font-medium text-white italic">"{data.verdict}"</p>
                </div>
            </motion.div>

            {/* Main Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { title: 'Visuals', icon: 'fa-eye', data: data.categories.visual },
                    { title: 'Audio', icon: 'fa-volume-high', data: data.categories.audio },
                    { title: 'Copy', icon: 'fa-pen-nib', data: data.categories.copy }
                ].map((pillar, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * idx }} className="bg-[#161616] p-5 rounded-xl border border-white/10 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <i className={`fa-solid ${pillar.icon} text-gray-400`}></i>
                                <h3 className="font-bold text-white">{pillar.title}</h3>
                            </div>
                            <span className="font-mono font-bold text-[#00F2EA]">{pillar.data.score}%</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 flex-grow">{pillar.data.feedback}</p>
                        {pillar.data.fix && (
                            <div className="mt-auto pt-3 border-t border-white/5">
                                <p className="text-xs text-[#00F2EA] font-bold uppercase mb-1">Fix:</p>
                                <p className="text-sm text-white italic">{pillar.data.fix}</p>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Diagnostic Checks */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-[#00F2EA]"></i> Diagnostic Checks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.checks.map((check, idx) => (
                        <div key={idx} className="bg-[#161616] p-4 rounded-xl border border-white/5 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase text-gray-500">{check.label}</span>
                                <StatusChip status={check.status} />
                            </div>
                            <p className="text-sm text-gray-300 mb-2">{check.details}</p>
                            {check.fix && <p className="text-xs text-[#00F2EA] mt-auto pt-2 border-t border-white/5">Fix: {check.fix}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalysisResult;