'use client';

import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player } from '@/components/game/Podium';

interface ExportRankingPDFProps {
  gameCode: string;
  quizTitle: string;
  players: Player[];
}

export default function ExportRankingPDF({ gameCode, quizTitle, players }: ExportRankingPDFProps) {
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(22);
    doc.setTextColor(70, 23, 143); // Morado Kahoot
    doc.text(`Ranking: ${quizTitle}`, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Código de partida: ${gameCode} | Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

    // Tabla
    const tableData = players.map((p, index) => [
      index + 1,
      p.avatar,
      p.nickname,
      `${p.points} pts`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Avatar', 'Jugador', 'Puntos']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [70, 23, 143], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 255] },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 30, halign: 'center', fontSize: 16 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
    });

    doc.save(`ranking-${gameCode}.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="flex items-center gap-2 px-6 py-3 bg-[#1368CE] hover:bg-[#0f52a3] text-white font-bold rounded-xl shadow-lg transition transform hover:scale-105"
    >
      <span>📄</span> Exportar Ranking a PDF
    </button>
  );
}